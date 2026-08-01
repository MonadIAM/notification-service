import { QueryOrder } from "@mikro-orm/postgresql";

import { NotificationCategory, ChannelType } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";

export class PreferenceAdapter implements Adapters.Contract<Entities.Preference, Adapters.Preference.Types> {
    public buildWhereORM(
        filters: Adapters.Preference.Filters,
        basic: ORM.ObjectQuery<Entities.Preference> = {},
    ): ORM.ObjectQuery<Entities.Preference> {
        const where: ORM.ObjectQuery<Entities.Preference> = basic;

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
        if (filters.isDuplicationEnabled !== undefined) {
            where.isDuplicationEnabled = { $eq: filters.isDuplicationEnabled };
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Adapters.Preference.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Preference, P, F> = {},
    ): ORM.FindOptions<Entities.Preference, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Preference>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
