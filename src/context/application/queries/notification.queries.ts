import { Inject, Injectable, Scope } from "@nestjs/common";
import { LoadStrategy } from "@mikro-orm/core";

import { NOTIFICATION_REPOSITORY } from "~context/infrastructure/repositories";
import { ChannelType, MessageStatus, QueryMode } from "~context/enums";
import { OTP_MESSAGE_TEMPLATES } from "~context/constants";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationQueries implements Queries.Notification.Contract {
    public constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly notificationRepository: Repositories.Notification.QueryContract,
    ) {}

    public async countUnread(props: Queries.Notification.CountUnread.Props): Queries.Notification.CountUnread.Result {
        const count = await this.notificationRepository.count({
            where: {
                template: { $nin: [...OTP_MESSAGE_TEMPLATES] },
                recipient: { account: props.actor },
                messages: {
                    $some: {
                        channelType: ChannelType.IN_APP,
                        status: MessageStatus.DELIVERED,
                        readAt: null,
                    },
                },
            },
        });

        return { count };
    }

    public async findUnique(props: Queries.Notification.FindUnique.Props): Queries.Notification.FindUnique.Result {
        const options: ORM.FindOptions<Entities.Notification, "messages"> = {
            strategy: LoadStrategy.JOINED,
            populate: ["messages"],
        };

        const where: ORM.FilterQuery<Entities.Notification> = {
            id: props.notification,
        };

        if (props.mode === QueryMode.DEFAULT) {
            where.template = { $nin: [...OTP_MESSAGE_TEMPLATES] };
            where.recipient = { account: props.actor };
            where.messages = {
                $some: {
                    channelType: ChannelType.IN_APP,
                    status: MessageStatus.DELIVERED,
                },
            };
        }

        const notification = await this.notificationRepository.findUniqueOrThrow({ where, options });

        return this.mapNotification({ notification });
    }

    public async findMany(props: Queries.Notification.FindMany.Props): Queries.Notification.FindMany.Result {
        const options: ORM.FindOptions<Entities.Notification, "messages"> = {
            strategy: LoadStrategy.JOINED,
            populate: ["messages"],
        };

        const prefilter: ORM.ObjectQuery<Entities.Notification> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.template = { $nin: [...OTP_MESSAGE_TEMPLATES] };
            prefilter.recipient = { account: props.actor };
            prefilter.messages = {
                $some: {
                    channelType: ChannelType.IN_APP,
                    status: MessageStatus.DELIVERED,
                },
            };
        }

        const [notifications, count] = await this.notificationRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
            options,
        });

        return [notifications.map((notification) => this.mapNotification({ notification })), count];
    }

    public mapNotification({
        notification,
    }: Queries.Notification.MapNotification.Props): Queries.Notification.MapNotification.Result {
        const result: Queries.Notification.Data = { ...notification, message: null, duplicatedTo: [] };

        for (const message of notification.messages.getItems()) {
            if (message.channelType === ChannelType.IN_APP) {
                result.message = message;
            } else if (message.status === MessageStatus.DELIVERED) {
                result.duplicatedTo.push(message.channelType);
            }
        }

        return result;
    }
}
