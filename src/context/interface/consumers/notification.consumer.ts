import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { NotificationTopicAction, NotificationContentKind } from "@monadiam/shared";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { escapeUTF8 } from "entities";
import { lastValueFrom } from "rxjs";

import { KAFKA_RETRY_SERVICE, KAFKA_SCHEMA_REGISTRY, KAFKA_SERVICE, KafkaIncomingMapper } from "~infrastructure/kafka";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { NOTIFICATION_COMMANDS } from "~context/application/commands";
import { CONSUMER_META, CUSTOM_TEMPLATE } from "~context/constants";
import { KafkaTopic } from "~context/enums";

@Controller()
export class NotificationConsumer implements Consumers.Notification.Contract, OnModuleInit {
    private readonly incomingMapper = new KafkaIncomingMapper();
    private readonly logger = new Logger(NotificationConsumer.name);
    private readonly consumerKey = "notification.notification.v1";

    public constructor(
        private readonly i18nService: I18nService,
        @Inject(NOTIFICATION_COMMANDS)
        private readonly notificationCommands: Commands.Notification.ConsumerContract,
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

    @EventPattern(KafkaTopic.NOTIFICATION)
    public async handle(
        @Payload() message: Consumers.Notification.Message,
        @Ctx() context: KafkaContext,
    ): Consumers.Notification.Handle.Result {
        const incoming = {
            consumerKey: this.consumerKey,
            event: this.incomingMapper.reference({ context }),
        };
        await this.kafkaRetry.execute({
            topic: KafkaTopic.NOTIFICATION,
            heartbeat: context.getHeartbeat(),
            process: () =>
                this.process({
                    incoming: this.incomingMapper.map({ consumerKey: this.consumerKey, context }),
                    message,
                }),
            reject: (error) => this.reject({ incoming, message, error }),
        });
    }

    public async process(props: Consumers.Notification.Process.Props): Consumers.Notification.Process.Result {
        const { incoming } = props;
        const message = await this.schemaRegistry.decode<Consumers.Notification.Message>({
            topic: KafkaTopic.NOTIFICATION,
            value: props.message,
        });
        this.schemaRegistry.validate({ topic: KafkaTopic.NOTIFICATION, value: message });
        if (message.actionType === NotificationTopicAction.CANCEL) {
            await this.notificationCommands.cancel({
                input: {
                    dedupKey: message.payload.input.dedupKey,
                    override: await this.render({ payload: message.payload.input.override }),
                },
                actor: message.payload.actor,
                realm: message.payload.realm,
                context: CONSUMER_META,
                incoming,
            });
        } else {
            await this.publish({ incoming, payload: message.payload });
        }
    }

    public async reject(props: Consumers.Notification.Reject.Props): Consumers.Notification.Reject.Result {
        const { incoming, message, error } = props;
        this.logger.warn(`Rejected message in notification consumer: ${String(error)}`);

        await lastValueFrom(
            this.kafkaClient.emit(KafkaTopic.NOTIFICATION_DEAD, {
                key: incoming.event,
                value: {
                    originalTopic: KafkaTopic.NOTIFICATION,
                    error: String(error),
                    payload: message,
                },
            }),
        );

        this.kafkaMetrics.recordDead({ topic: KafkaTopic.NOTIFICATION, error });
    }

    public async publish(props: Consumers.Notification.Publish.Props): Consumers.Notification.Publish.Result {
        const { incoming, payload } = props;
        const { actor, realm } = payload;
        const input = await this.render({ payload });

        await this.notificationCommands.create({
            context: CONSUMER_META,
            incoming,
            actor,
            realm,
            input,
        });
    }

    public async render(props: Consumers.Notification.Render.Props): Consumers.Notification.Render.Result {
        const { realm, input } = props.payload;

        let title: string;
        let body: string;

        if (input.kind === NotificationContentKind.TEMPLATE) {
            const args = input.params
                ? Object.fromEntries(Object.entries(input.params).map(([key, value]) => [key, escapeUTF8(value)]))
                : undefined;
            [title, body] = await Promise.all<[string, string]>([
                this.i18nService.translate(`templates.${input.template}.subject`, {
                    lang: input.language,
                    args,
                }),
                this.i18nService.translate(`templates.${input.template}.body`, {
                    lang: input.language,
                    args,
                }),
            ]);
        } else {
            [title, body] = [input.title, input.text];
        }

        return {
            template: input.kind === NotificationContentKind.TEMPLATE ? input.template : CUSTOM_TEMPLATE,
            sourceService: input.sourceService,
            account: input.recipient,
            category: input.category,
            dedupKey: input.dedupKey,
            realm,
            title,
            body,
        };
    }
}
