import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { Channel } from "~context/domain/entities";
import { ChannelType } from "~context/enums";

export class ChannelAdapter implements Adapters.Contract<Channel, Adapters.Channel.Types> {
    public buildWhereORM(
        filters: Adapters.Channel.Filters,
        basic: ORM.ObjectQuery<Channel> = {},
    ): ORM.ObjectQuery<Channel> {
        const where: ORM.ObjectQuery<Channel> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.recipient) {
            where.recipient = ORMAdapter.applyStringFilter(filters.recipient);
        }
        if (filters.type) {
            where.type = ORMAdapter.applyStringFilter<ChannelType>(filters.type);
        }
        if (filters.isVerified !== undefined) {
            where.isVerified = { $eq: filters.isVerified };
        }
        if (filters.updatedAt) {
            where.updatedAt = ORMAdapter.applyOrdinalFilter<Date>(filters.updatedAt);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Adapters.Channel.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Channel, P, F> = {},
    ): ORM.FindOptions<Channel, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Channel>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
