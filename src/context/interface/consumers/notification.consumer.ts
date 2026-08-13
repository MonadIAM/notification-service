import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { NotificationTopicAction, NotificationContentKind } from "@monadiam/shared";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { lastValueFrom } from "rxjs";

import { KafkaUtils, KAFKA_SERVICE } from "~infrastructure/kafka";
import { CONSUMER_META, CUSTOM_TEMPLATE } from "~context/constants";
import { Exception } from "~common/exceptions";
import { KafkaTopic } from "~context/enums";

import { NOTIFICATION_COMMANDS } from "../commands";

@Controller()
export class NotificationConsumer implements Consumers.Notification.Contract, OnModuleInit {
    private readonly logger = new Logger(NotificationConsumer.name);

    public constructor(
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
        private readonly i18nService: I18nService,
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
                    context: CONSUMER_META,
                    input: {
                        dedupKey: message.payload.dedupKey,
                    },
                });

                if (alreadyDispatched) {
                    await this.publish({ payload: message.payload.override });
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
                            payload: message,
                            error: String(error),
                        },
                    }),
                );
            } else {
                this.logger.warn(`Non-retryable error in notification consumer: ${String(error)}`);
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.NOTIFICATION_DEAD, {
                        value: {
                            originalTopic: KafkaTopic.NOTIFICATION,
                            payload: message,
                            error: String(error),
                        },
                    }),
                );
            }
        }
    }

    public async publish(props: Consumers.Notification.Publish.Props): Consumers.Notification.Publish.Result {
        const { payload } = props;

        const [title, body] =
            payload.kind === NotificationContentKind.TEMPLATE
                ? await Promise.all<[string, string]>([
                      this.i18nService.translate(`templates.${payload.template}.subject`, {
                          args: payload.params,
                          lang: payload.language,
                      }),
                      this.i18nService.translate(`templates.${payload.template}.body`, {
                          args: payload.params,
                          lang: payload.language,
                      }),
                  ])
                : [payload.title, payload.text];

        await this.notificationCommands.create({
            context: CONSUMER_META,
            input: {
                template: payload.kind === NotificationContentKind.TEMPLATE ? payload.template : CUSTOM_TEMPLATE,
                sourceService: payload.sourceService,
                account: payload.recipient,
                category: payload.category,
                dedupKey: payload.dedupKey,
                realm: payload.realm,
                title,
                body,
            },
        });
    }
}
