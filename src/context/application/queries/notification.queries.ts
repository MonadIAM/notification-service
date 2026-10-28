import { Inject, Injectable, Scope } from "@nestjs/common";

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

    public findUnique(props: Queries.Notification.FindUnique.Props): Queries.Notification.FindUnique.Result {
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

        return this.notificationRepository.findUniqueOrThrow({ where });
    }

    public findMany(props: Queries.Notification.FindMany.Props): Queries.Notification.FindMany.Result {
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

        return this.notificationRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
