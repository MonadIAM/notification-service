import { QueryOrder } from "@mikro-orm/postgresql";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";

export class MessageAdapter implements Adapters.Contract<Entities.Message, Adapters.Message.Types> {
    public buildWhereORM(
        filters: Adapters.Message.Filters,
        basic: ORM.ObjectQuery<Entities.Message> = {},
    ): ORM.ObjectQuery<Entities.Message> {
        const where: ORM.ObjectQuery<Entities.Message> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.notification) {
            where.notification = ORMAdapter.applyStringFilter(filters.notification);
        }
        if (filters.channel) {
            where.channel = ORMAdapter.applyStringFilter(filters.channel);
        }
        if (filters.channelType) {
            where.channelType = ORMAdapter.applyStringFilter<ChannelType>(filters.channelType);
        }
        if (filters.status) {
            where.status = ORMAdapter.applyStringFilter<MessageStatus>(filters.status);
        }
        if (filters.failureReason) {
            where.failureReason = ORMAdapter.applyStringFilter<FailureReason>(filters.failureReason);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Adapters.Message.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Message, P, F> = {},
    ): ORM.FindOptions<Entities.Message, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Message>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
