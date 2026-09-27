import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { AccountTopicAction, KafkaTopic } from "@monadiam/shared";
import { I18nService } from "nestjs-i18n";
import { escapeUTF8 } from "entities";
import { lastValueFrom } from "rxjs";

import { KAFKA_RETRY_SERVICE, KAFKA_SCHEMA_REGISTRY, KAFKA_SERVICE, KafkaIncomingMapper } from "~infrastructure/kafka";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { RECIPIENT_COMMANDS, NOTIFICATION_COMMANDS } from "~context/application/commands";
import { MessageTemplate } from "~context/enums";
import { CONSUMER_META } from "~context/constants";

@Controller()
export class AccountConsumer implements Consumers.Account.Contract, OnModuleInit {
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly logger = new Logger(AccountConsumer.name);
    private readonly consumerKey = "notification.account.v1";

    public constructor(
        private readonly i18nService: I18nService,
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
        @Inject(RECIPIENT_COMMANDS)
        private readonly recipientCommands: Commands.Recipient.ConsumerContract,
        @Inject(KAFKA_METRICS_RECORDER)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_SERVICE)
        private readonly kafkaRetry: Kafka.Retry.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();
    }

    @EventPattern(KafkaTopic.ACCOUNT)
    public async handle(
        @Payload() message: Consumers.Account.Message,
        @Ctx() context: KafkaContext,
    ): Consumers.Account.Handle.Result {
        const incoming = {
            consumerKey: this.consumerKey,
            event: this.incomingMapper.reference({ context }),
        };
        await this.kafkaRetry.execute({
            topic: KafkaTopic.ACCOUNT,
            heartbeat: context.getHeartbeat(),
            process: () =>
                this.process({
                    incoming: this.incomingMapper.map({ consumerKey: this.consumerKey, context }),
                    message,
                }),
            reject: (error) => this.reject({ incoming, message, error }),
        });
    }

    public async process(props: Consumers.Account.Process.Props): Consumers.Account.Process.Result {
        const message = await this.schemaRegistry.decode<Consumers.Account.Message>({
            topic: KafkaTopic.ACCOUNT,
            value: props.message,
        });
        this.schemaRegistry.validate({ topic: KafkaTopic.ACCOUNT, value: message });
        switch (message.actionType) {
            case AccountTopicAction.CREATE: {
                const args = { otp: escapeUTF8(message.payload.otp) };
                const [title, body] = await Promise.all<[string, string]>([
                    this.i18nService.translate(`templates.${MessageTemplate.ACCOUNT_VERIFICATION_OTP}.subject`, {
                        lang: "en",
                        args,
                    }),
                    this.i18nService.translate(`templates.${MessageTemplate.ACCOUNT_VERIFICATION_OTP}.body`, {
                        lang: "en",
                        args,
                    }),
                ]);
                await this.notificationCommands.register({
                    input: {
                        account: message.payload.account,
                        identifier: message.payload.identifier,
                        title,
                        body,
                    },
                    incoming: props.incoming,
                    context: CONSUMER_META,
                });
                break;
            }
            case AccountTopicAction.VERIFY:
                if (message.payload.identifier) {
                    await this.recipientCommands.confirm({
                        input: { account: message.payload.account, identifier: message.payload.identifier },
                        incoming: props.incoming,
                        context: CONSUMER_META,
                    });
                }
                break;
            case AccountTopicAction.PURGE:
                await this.recipientCommands.purge({
                    input: { account: message.payload.account },
                    incoming: props.incoming,
                    context: CONSUMER_META,
                });
                break;
        }
    }

    public async reject(props: Consumers.Account.Reject.Props): Consumers.Account.Reject.Result {
        const { incoming, message, error } = props;
        this.logger.warn(`Rejected message in account consumer: ${String(error)}`);

        await lastValueFrom(
            this.kafkaClient.emit(KafkaTopic.ACCOUNT_DEAD, {
                key: incoming.event,
                value: {
                    originalTopic: KafkaTopic.ACCOUNT,
                    error: String(error),
                    payload: message,
                },
            }),
        );

        this.kafkaMetrics.recordDead({ topic: KafkaTopic.ACCOUNT, error });
    }
}
