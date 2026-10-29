import { Observable, Subject, concatMap, filter, interval, map, merge, takeUntil, timer, timeout } from "rxjs";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import Redis from "ioredis";

import { NOTIFICATION_REPOSITORY, CHANNEL_REPOSITORY } from "~context/infrastructure/repositories";
import { OTP_MESSAGE_TEMPLATES } from "~context/constants";
import { ChannelType, MessageStatus } from "~context/enums";
import { REDIS_CACHE_CLIENT } from "~infrastructure/redis";

@Injectable()
export class NotificationStreamService
    implements InfrastructureServices.NotificationStream.Contract, OnModuleInit, OnModuleDestroy
{
    private readonly topic = "notification:inbox:changed";
    private readonly changes = new Subject<Nullable<InfrastructureServices.NotificationStream.Change>>();
    private readonly logger = new Logger(NotificationStreamService.name);
    private readonly disconnected = new Subject<void>();
    private readonly subscriber: Redis;
    private ready = false;

    public constructor(
        @InjectEntityManager("write")
        private readonly writeManager: ORM.EntityManager,
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly notificationRepository: Repositories.Notification.Contract,
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.Contract,
        @Inject(REDIS_CACHE_CLIENT)
        private readonly redis: Redis,
    ) {
        this.subscriber = redis.duplicate({ autoResubscribe: false });
    }

    public onModuleInit(): void {
        this.subscriber.on("message", (topic, payload) => {
            if (topic === this.topic) {
                try {
                    const change: InfrastructureServices.NotificationStream.Change = JSON.parse(payload);
                    if (
                        typeof change.account === "string" &&
                        (change.message === null || typeof change.message === "string")
                    ) {
                        this.changes.next(change);
                    }
                } catch (error) {
                    this.logger.warn(error);
                }
            }
        });

        this.subscriber.on("ready", () => {
            void this.subscriber
                .subscribe(this.topic)
                .then(() => {
                    this.ready = this.subscriber.status === "ready";
                    this.changes.next(null);
                })
                .catch((error: unknown) => {
                    this.logger.error(error);
                });
        });

        this.subscriber.on("close", () => {
            this.ready = false;
            this.disconnected.next();
        });

        this.subscriber.on("error", (error) => this.logger.error(error));
        void this.subscriber.connect().catch((error: unknown) => this.logger.error(error));
    }

    public onModuleDestroy(): void {
        this.disconnected.next();
        this.disconnected.complete();
        this.changes.complete();
        this.subscriber.disconnect();
    }

    public watch(
        props: InfrastructureServices.NotificationStream.Watch.Props,
    ): InfrastructureServices.NotificationStream.Watch.Result {
        const updates = new Observable<Nullable<InfrastructureServices.NotificationStream.Change>>((subscriber) => {
            const subscription = this.changes
                .pipe(filter((change) => change === null || change.account === props.account))
                .subscribe(subscriber);
            if (this.ready) {
                subscriber.next(null);
            }
            return () => subscription.unsubscribe();
        }).pipe(
            concatMap((change) => this.snapshot({ account: props.account, change })),
            timeout({ first: 10_000 }),
        );
        const heartbeat = interval(15_000).pipe(map(() => ({ type: "heartbeat", data: "" })));
        const lifetime = Math.min(300_000, Math.max(0, (props.expiresAt ?? 0) * 1000 - Date.now()));

        return merge(updates, heartbeat).pipe(takeUntil(merge(this.disconnected, timer(lifetime))));
    }

    public async snapshot(
        props: InfrastructureServices.NotificationStream.Snapshot.Props,
    ): InfrastructureServices.NotificationStream.Snapshot.Result {
        const transaction = this.writeManager.fork();
        const count = await this.notificationRepository.count({
            transaction,
            where: {
                messages: { $some: { channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED, readAt: null } },
                template: { $nin: [...OTP_MESSAGE_TEMPLATES] },
                recipient: { account: props.account },
            },
        });
        const channel = await this.channelRepository.findUnique({
            where: { recipient: { account: props.account }, type: ChannelType.IN_APP },
            transaction,
        });

        return {
            type: "unread-count",
            data: { count, message: props.change?.message ?? null, soundEnabled: channel?.soundEnabled === true },
        };
    }

    public async publish(
        props: InfrastructureServices.NotificationStream.Publish.Props,
    ): InfrastructureServices.NotificationStream.Publish.Result {
        try {
            await this.redis.publish(this.topic, JSON.stringify(props));
        } catch (error) {
            this.logger.error(error);
            this.disconnected.next();
        }
    }

    public async publishMessages(
        props: InfrastructureServices.NotificationStream.PublishMessages.Props,
    ): InfrastructureServices.NotificationStream.PublishMessages.Result {
        for await (const message of props.messages) {
            if (
                message.channelType === ChannelType.IN_APP &&
                message.status === MessageStatus.DELIVERED &&
                !OTP_MESSAGE_TEMPLATES.includes(message.notification.template)
            ) {
                await this.publish({ account: message.notification.recipient.account, message: message.id });
            }
        }
    }
}
