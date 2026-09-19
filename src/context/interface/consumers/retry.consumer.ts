import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger } from "@nestjs/common";
import { lastValueFrom } from "rxjs";

import { KAFKA_RETRY_SERVICE, KAFKA_SCHEMA_REGISTRY, KAFKA_SERVICE, KafkaIncomingMapper } from "~infrastructure/kafka";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { KAFKA_RETRY_QUEUE } from "~context/infrastructure/queues";
import { Exception } from "~common/exceptions";
import { KafkaTopic } from "~context/enums";

const RETRY_TOPICS = [KafkaTopic.MESSAGE_DISPATCH_RETRY];

@Controller()
export class RetryConsumer implements Consumers.Retry.Contract {
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly logger = new Logger(RetryConsumer.name);

    public constructor(
        @Inject(KAFKA_METRICS_RECORDER)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_QUEUE)
        private readonly kafkaRetryQueue: Queues.KafkaRetry.Contract,
        @Inject(KAFKA_RETRY_SERVICE)
        private readonly kafkaRetry: Kafka.Retry.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    @EventPattern(RETRY_TOPICS)
    public async handle(
        @Payload() message: Consumers.Retry.Message,
        @Ctx() context: KafkaContext,
    ): Consumers.Retry.Handle.Result {
        const event = this.incomingMapper.reference({ context });
        await this.kafkaRetry.execute({
            topic: context.getTopic(),
            heartbeat: context.getHeartbeat(),
            process: () => this.process({ event, message, context }),
            reject: (error) => this.reject({ event, message, error }),
        });
    }

    public async process(props: Consumers.Retry.Process.Props): Consumers.Retry.Process.Result {
        const { event, context } = props;
        this.incomingMapper.event({ context });
        const message = await this.schemaRegistry.decode<Consumers.Retry.Message>({
            topic: context.getTopic(),
            value: props.message,
        });
        this.schemaRegistry.validate({ topic: context.getTopic(), value: message });
        if (message?.originalTopic !== KafkaTopic.MESSAGE_DISPATCH) {
            throw Exception.unprocessable({ messageKey: "services.kafka-retry.INVALID_ORIGINAL_TOPIC" });
        }

        try {
            await this.kafkaRetryQueue.schedule({ event, message });
        } catch (cause) {
            throw Exception.externalServiceFailed({
                messageKey: "services.kafka-retry.SCHEDULE_FAILED",
                params: { error: String(cause) },
            });
        }
    }

    public async reject(props: Consumers.Retry.Reject.Props): Consumers.Retry.Reject.Result {
        const { event, message, error } = props;
        this.logger.warn(`Rejected dispatch retry envelope: ${String(error)}`);
        await lastValueFrom(
            this.kafkaClient.emit(KafkaTopic.MESSAGE_DISPATCH_DEAD, {
                key: event,
                value: {
                    originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                    payload: message,
                    error: String(error),
                },
            }),
        );
        this.kafkaMetrics.recordDead({ topic: KafkaTopic.MESSAGE_DISPATCH, error });
    }
}
