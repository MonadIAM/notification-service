import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { NotificationTopicAction, NotificationContentKind } from "@monadiam/shared";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { lastValueFrom } from "rxjs";

import { NOTIFICATION_COMMANDS } from "~context/application/commands";
import { CONSUMER_META, CUSTOM_TEMPLATE } from "~context/constants";
import { KafkaUtils, KAFKA_SERVICE } from "~infrastructure/kafka";
import { Exception } from "~common/exceptions";
import { KafkaTopic } from "~context/enums";

@Controller()
export class NotificationConsumer implements Consumers.Notification.Contract, OnModuleInit {
    private readonly logger = new Logger(NotificationConsumer.name);

    public constructor(
        private readonly i18nService: I18nService,
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();
    }

    @EventPattern(KafkaTopic.NOTIFICATION)
    public async handle(
        @Payload()
        message: Consumers.Notification.Message,
        @Ctx()
        context: KafkaContext,
    ): Consumers.Notification.Handle.Result {
        try {
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
        } catch (error) {
            if (Exception.isRetryable(error)) {
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.NOTIFICATION_RETRY, {
                        headers: {
                            "x-retry-count": String(KafkaUtils.extractRetryCount(context)),
                        },
                        value: {
                            originalTopic: KafkaTopic.NOTIFICATION,
                            error: String(error),
                            payload: message,
                        },
                    }),
                );
            } else {
                this.logger.warn(`Non-retryable error in notification consumer: ${String(error)}`);
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.NOTIFICATION_DEAD, {
                        value: {
                            originalTopic: KafkaTopic.NOTIFICATION,
                            error: String(error),
                            payload: message,
                        },
                    }),
                );
            }
        }
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
