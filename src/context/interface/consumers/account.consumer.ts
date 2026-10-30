import { KafkaRetriableException, EventPattern, Payload, Ctx, KafkaContext } from "@nestjs/microservices";
import { I18nService, I18N_OPTIONS, type I18nOptions } from "nestjs-i18n";
import { AccountTopicAction, KafkaTopic } from "@monadiam/shared";
import { Controller, Inject, Logger } from "@nestjs/common";
import { match } from "@formatjs/intl-localematcher";
import { escapeUTF8 } from "entities";

import { RECIPIENT_COMMANDS, NOTIFICATION_COMMANDS, CHANNEL_COMMANDS } from "~context/application/commands";
import { KAFKA_RETRY_SERVICE, KAFKA_SCHEMA_REGISTRY, KafkaIncomingMapper } from "~infrastructure/kafka";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { CONSUMER_META } from "~context/constants";
import { MessageTemplate } from "~context/enums";

@Controller()
export class AccountConsumer implements Consumers.Account.Contract {
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly logger = new Logger(AccountConsumer.name);
    private readonly consumerKey = "notification.account.v1";

    public constructor(
        private readonly i18nService: I18nService,
        @Inject(I18N_OPTIONS)
        private readonly i18nOptions: I18nOptions,
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
        @Inject(RECIPIENT_COMMANDS)
        private readonly recipientCommands: Commands.Recipient.ConsumerContract,
        @Inject(CHANNEL_COMMANDS)
        private readonly channelCommands: Commands.Channel.ConsumerContract,
        @Inject(KAFKA_METRICS_RECORDER)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_SERVICE)
        private readonly kafkaRetry: Kafka.Retry.Contract,
    ) {}

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
                const language = match(
                    [this.i18nService.resolveLanguage(message.payload.locale ?? this.i18nOptions.fallbackLanguage)],
                    this.i18nService.getSupportedLanguages(),
                    this.i18nOptions.fallbackLanguage,
                    { algorithm: "lookup" },
                );

                const args = { otp: escapeUTF8(message.payload.otp) };
                const [title, body] = await Promise.all<[string, string]>([
                    this.i18nService.translate(`templates.${MessageTemplate.ACCOUNT_VERIFICATION_OTP}.subject`, {
                        lang: language,
                        args,
                    }),
                    this.i18nService.translate(`templates.${MessageTemplate.ACCOUNT_VERIFICATION_OTP}.body`, {
                        lang: language,
                        args,
                    }),
                ]);

                await this.notificationCommands.register({
                    input: {
                        identifier: message.payload.identifier,
                        timezone: message.payload.timezone,
                        account: message.payload.account,
                        locale: message.payload.locale,
                        language,
                        title,
                        body,
                    },
                    incoming: props.incoming,
                    context: CONSUMER_META,
                });
                break;
            }
            case AccountTopicAction.VERIFY:
                await this.recipientCommands.confirm({
                    input: {
                        identifier: message.payload.identifier,
                        timezone: message.payload.timezone,
                        account: message.payload.account,
                        locale: message.payload.locale,
                    },
                    incoming: props.incoming,
                    context: CONSUMER_META,
                });
                break;
            case AccountTopicAction.EMAIL_VERIFIED:
                await this.channelCommands.confirmEmail({
                    incoming: props.incoming,
                    context: CONSUMER_META,
                    input: message.payload,
                });
                break;
            case AccountTopicAction.EMAIL_SELECTED:
                await this.channelCommands.selectEmail({
                    incoming: props.incoming,
                    context: CONSUMER_META,
                    input: message.payload,
                });
                break;
            case AccountTopicAction.EMAIL_PURGED:
                await this.channelCommands.purgeEmail({
                    incoming: props.incoming,
                    context: CONSUMER_META,
                    input: message.payload,
                });
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

    public reject(props: Consumers.Account.Reject.Props): Consumers.Account.Reject.Result {
        const { error } = props;
        this.logger.warn(`Account synchronization failed; keeping the partition offset: ${String(error)}`);
        this.kafkaMetrics.recordRetry({ topic: KafkaTopic.ACCOUNT, error });

        return Promise.reject(new KafkaRetriableException(error instanceof Error ? error : String(error)));
    }
}
