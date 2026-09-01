import { NotificationTopicAction, NotificationContentKind } from "@monadiam/shared";
import { EventPattern, Payload, ClientKafka } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { lastValueFrom } from "rxjs";

import { KafkaTopicBuilder, KAFKA_RETRY_REGISTRY, KAFKA_SCHEMA_REGISTRY, KAFKA_SERVICE } from "~infrastructure/kafka";
import { NOTIFICATION_COMMANDS } from "~context/application/commands";
import { CONSUMER_META, CUSTOM_TEMPLATE } from "~context/constants";
import { Exception } from "~common/exceptions";
import { KafkaTopic } from "~context/enums";

@Controller()
export class NotificationConsumer implements Consumers.Notification.Contract, OnModuleInit {
    private readonly logger = new Logger(NotificationConsumer.name);

    public constructor(
        private readonly i18nService: I18nService,
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
        @Inject(KAFKA_SCHEMA_REGISTRY)
        private readonly schemaRegistry: Kafka.SchemaRegistry.PublicContract,
        @Inject(KAFKA_RETRY_REGISTRY)
        private readonly retryRegistry: Kafka.RetryRegistry.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();

        this.retryRegistry.register({
            topic: KafkaTopic.NOTIFICATION,
            handler: this,
        });
    }

    @EventPattern(KafkaTopic.NOTIFICATION)
    public async handle(@Payload() message: Consumers.Notification.Message): Consumers.Notification.Handle.Result {
        try {
            await this.process({ message });
        } catch (error) {
            await this.reject({ message, error });
        }
    }

    public async process(props: Consumers.Notification.Process.Props): Consumers.Notification.Process.Result {
        const { message } = props;
        this.schemaRegistry.validate({ topic: KafkaTopic.NOTIFICATION, value: message });
        if (message.actionType === NotificationTopicAction.CANCEL) {
            const { alreadyDispatched } = await this.notificationCommands.cancel({
                input: { dedupKey: message.payload.input.dedupKey },
                actor: message.payload.actor,
                realm: message.payload.realm,
                context: CONSUMER_META,
            });

            if (alreadyDispatched) {
                await this.publish({ payload: message.payload.input.override });
            }
        } else {
            await this.publish({ payload: message.payload });
        }
    }

    public async reject(props: Consumers.Notification.Reject.Props): Consumers.Notification.Reject.Result {
        const { message, error } = props;
        const retryable = Exception.isRetryable(error);

        if (!retryable) {
            this.logger.warn(`Non-retryable error in notification consumer: ${String(error)}`);
        }

        await lastValueFrom(
            this.kafkaClient.emit(
                retryable ? KafkaTopicBuilder.retry(KafkaTopic.NOTIFICATION) : KafkaTopic.NOTIFICATION_DEAD,
                {
                    value: {
                        originalTopic: KafkaTopic.NOTIFICATION,
                        error: String(error),
                        payload: message,
                    },
                },
            ),
        );
    }

    public async publish(props: Consumers.Notification.Publish.Props): Consumers.Notification.Publish.Result {
        const { actor, realm, input } = props.payload;

        const [title, body] =
            input.kind === NotificationContentKind.TEMPLATE
                ? await Promise.all<[string, string]>([
                      this.i18nService.translate(`templates.${input.template}.subject`, {
                          lang: input.language,
                          args: input.params,
                      }),
                      this.i18nService.translate(`templates.${input.template}.body`, {
                          lang: input.language,
                          args: input.params,
                      }),
                  ])
                : [input.title, input.text];

        await this.notificationCommands.create({
            context: CONSUMER_META,
            actor,
            realm,
            input: {
                template: input.kind === NotificationContentKind.TEMPLATE ? input.template : CUSTOM_TEMPLATE,
                sourceService: input.sourceService,
                account: input.recipient,
                category: input.category,
                dedupKey: input.dedupKey,
                realm,
                title,
                body,
            },
        });
    }
}
