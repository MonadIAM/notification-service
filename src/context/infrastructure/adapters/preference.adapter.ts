import { QueryOrder } from "@mikro-orm/postgresql";

import { NotificationCategory, ChannelType } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";
import { Preference } from "~context/domain/entities";

export class PreferenceAdapter implements Adapters.Contract<Preference, Adapters.Preference.Types> {
    public buildWhereORM(
        filters: Adapters.Preference.Filters,
        basic: ORM.ObjectQuery<Preference> = {},
    ): ORM.ObjectQuery<Preference> {
        const where: ORM.ObjectQuery<Preference> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.recipient) {
            where.recipient = ORMAdapter.applyStringFilter(filters.recipient);
        }
        if (filters.channelType) {
            where.channelType = ORMAdapter.applyStringFilter<ChannelType>(filters.channelType);
        }
        if (filters.category) {
            where.category = ORMAdapter.applyStringFilter<NotificationCategory>(filters.category);
        }
        if (filters.isEnabled !== undefined) {
            where.isEnabled = { $eq: filters.isEnabled };
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Adapters.Preference.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Preference, P, F> = {},
    ): ORM.FindOptions<Preference, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Preference>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
