import { KafkaRetriableException, EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { lastValueFrom } from "rxjs";

import { MESSAGE_REPOSITORY } from "~context/infrastructure/repositories";
import { FailureReason, KafkaTopic, MessageStatus } from "~context/enums";
import { CONSUMER_META, DEBOUNCED_CATEGORIES } from "~context/constants";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues";
import { MESSAGE_COMMANDS } from "~context/application/commands";
import { DISPATCH_SERVICE } from "~context/domain/services";
import { Exception } from "~common/exceptions";
import {
    KAFKA_SCHEMA_REGISTRY,
    KAFKA_RETRY_REGISTRY,
    KafkaIncomingMapper,
    KAFKA_RETRY_SERVICE,
    KAFKA_SERVICE,
} from "~infrastructure/kafka";

@Controller()
export class DispatchConsumer implements Consumers.MessageDispatch.Contract, OnModuleInit {
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly logger = new Logger(DispatchConsumer.name);
    private readonly consumerKey = "notification.message-dispatch.v1";

    public constructor(
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.QueryContract,
        @Inject(MESSAGE_COMMANDS)
        private readonly messageCommands: Commands.Message.ConsumerContract,
        @Inject(DISPATCH_DELAY_QUEUE)
        private readonly dispatchDelayQueue: Queues.DispatchDelay.Contract,
        @Inject(DISPATCH_SERVICE)
        private readonly dispatchService: Services.Dispatch.Contract,
        @Inject(KAFKA_METRICS_RECORDER)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_REGISTRY)
        private readonly retryRegistry: Kafka.RetryRegistry.Contract,
        @Inject(KAFKA_RETRY_SERVICE)
        private readonly kafkaRetry: Kafka.Retry.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();

        this.retryRegistry.register({
            topic: KafkaTopic.MESSAGE_DISPATCH,
            consumerKey: this.consumerKey,
            handler: this,
        });
    }

    @EventPattern(KafkaTopic.MESSAGE_DISPATCH)
    public async handle(
        @Payload() message: Consumers.MessageDispatch.Message,
        @Ctx() context: KafkaContext,
    ): Consumers.MessageDispatch.Handle.Result {
        const incoming = {
            consumerKey: this.consumerKey,
            event: this.incomingMapper.reference({ context }),
        };
        await this.kafkaRetry.execute({
            topic: KafkaTopic.MESSAGE_DISPATCH,
            heartbeat: context.getHeartbeat(),
            process: async () => {
                const source = this.incomingMapper.map({ consumerKey: this.consumerKey, context });
                const decoded = await this.schemaRegistry.decode<Consumers.MessageDispatch.Message>({
                    topic: KafkaTopic.MESSAGE_DISPATCH,
                    value: message,
                });

                try {
                    await this.process({ incoming: source, message: decoded });
                } catch (error) {
                    try {
                        await this.reject({ incoming: source, message: decoded, error });
                    } catch (failure) {
                        throw new KafkaRetriableException(failure instanceof Error ? failure : String(failure));
                    }
                }
            },
            reject: (error) => this.reject({ incoming, message, error, terminal: true }),
        });
    }

    public async process(props: Consumers.MessageDispatch.Process.Props): Consumers.MessageDispatch.Process.Result {
        const { incoming, message } = props;
        this.schemaRegistry.validate({ topic: KafkaTopic.MESSAGE_DISPATCH, value: message });
        const dispatch = await this.messageRepository.findUnique({
            options: { populate: ["notification"] },
            where: { id: message.payload.message },
        });

        if (dispatch?.status === MessageStatus.FAILED) {
            throw Exception.unprocessable({
                messageKey: "services.dispatch.ALREADY_FAILED",
                params: { error: dispatch.error },
            });
        }

        if (dispatch?.status === MessageStatus.QUEUED) {
            if (DEBOUNCED_CATEGORIES.includes(dispatch.notification.category)) {
                await this.dispatchDelayQueue.schedule({ message: dispatch.id, event: incoming.event });
            } else {
                await this.dispatchService.send({ message: dispatch });
                await this.messageCommands.markSent({ context: CONSUMER_META, input: { message: dispatch.id } });
            }
        }
    }

    public async reject(props: Consumers.MessageDispatch.Reject.Props): Consumers.MessageDispatch.Reject.Result {
        const { incoming, message, error } = props;
        const retryable = !props.terminal && Exception.isRetryable(error);

        if (!retryable) {
            this.logger.warn(`Non-retryable error in message dispatch consumer: ${String(error)}`);

            const [[dispatch]] =
                typeof message?.payload?.message === "string"
                    ? await this.messageRepository.findMany({ where: { id: message.payload.message } })
                    : [[]];

            if (dispatch?.status === MessageStatus.QUEUED) {
                await this.messageCommands.markFailed({
                    context: CONSUMER_META,
                    input: {
                        message: dispatch.id,
                        reason: FailureReason.PROVIDER,
                        error: String(error),
                    },
                });
            }
        }

        await lastValueFrom(
            this.kafkaClient.emit(retryable ? KafkaTopic.MESSAGE_DISPATCH_RETRY : KafkaTopic.MESSAGE_DISPATCH_DEAD, {
                key: incoming.event,
                value: {
                    originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                    error: String(error),
                    payload: message,
                },
            }),
        );

        if (retryable) {
            this.kafkaMetrics.recordRetry({ topic: KafkaTopic.MESSAGE_DISPATCH, error });
        } else {
            this.kafkaMetrics.recordDead({ topic: KafkaTopic.MESSAGE_DISPATCH, error });
        }
    }
}
