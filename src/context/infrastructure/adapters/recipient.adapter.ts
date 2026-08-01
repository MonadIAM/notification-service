import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";

export class RecipientAdapter implements Adapters.Contract<Entities.Recipient, Adapters.Recipient.Types> {
    public buildWhereORM(
        filters: Adapters.Recipient.Filters,
        basic: ORM.ObjectQuery<Entities.Recipient> = {},
    ): ORM.ObjectQuery<Entities.Recipient> {
        const where: ORM.ObjectQuery<Entities.Recipient> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.account) {
            where.account = ORMAdapter.applyStringFilter(filters.account);
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
        sort: Adapters.Recipient.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Recipient, P, F> = {},
    ): ORM.FindOptions<Entities.Recipient, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Recipient>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
