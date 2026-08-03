import { Inject, Injectable, Scope } from "@nestjs/common";

import { ChannelType, MessageStatus, QueryMode } from "~context/enums";
import { NOTIFICATION_REPOSITORY } from "~context/domain/repositories";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationQueries implements Queries.Notification.Contract {
    public constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly notificationRepository: Repositories.Notification.QueryContract,
    ) {}

    public findUnique(props: Queries.Notification.FindUnique.Props): Queries.Notification.FindUnique.Result {
        const where: ORM.FilterQuery<Entities.Notification> = { id: props.notification };

        if (props.mode === QueryMode.DEFAULT) {
            where.recipient = { account: props.actor };
            where.messages = { channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED };
        }

        return this.notificationRepository.findUniqueOrThrow({ where });
    }

    public findMany(props: Queries.Notification.FindMany.Props): Queries.Notification.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.Notification> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.recipient = { account: props.actor };
            prefilter.messages = { channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED };
        }

        return this.notificationRepository.findMany({
            prefilter,
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
        });
    }
}
