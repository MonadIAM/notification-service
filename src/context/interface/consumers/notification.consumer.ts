import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { NotificationContentKind } from "@monadiam/shared";
import { I18nService } from "nestjs-i18n";
import { lastValueFrom } from "rxjs";

import { KafkaUtils, KAFKA_SERVICE } from "~infrastructure/kafka";
import { Exception } from "~common/exceptions";
import { KafkaTopic } from "~context/enums";

import { NOTIFICATION_COMMANDS } from "../commands";

const CUSTOM_TEMPLATE = "CUSTOM";

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
    public async handle(@Payload() message: Consumers.Notification.Message, @Ctx() context: KafkaContext): Promise<void> {
        try {
            const { payload } = message;

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
                template: payload.kind === NotificationContentKind.TEMPLATE ? payload.template : CUSTOM_TEMPLATE,
                sourceService: payload.sourceService,
                account: payload.recipient,
                category: payload.category,
                dedupKey: payload.dedupKey,
                realm: payload.realm,
                title,
                body,
            });
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
}
