import { QueryOrder } from "@mikro-orm/postgresql";

import { ORMAdapter } from "~infrastructure/database/utils";
import { Recipient } from "~context/domain/entities";

export class RecipientAdapter implements Adapters.Contract<Recipient, Adapters.Recipient.Types> {
    public buildWhereORM(
        filters: Adapters.Recipient.Filters,
        basic: ORM.ObjectQuery<Recipient> = {},
    ): ORM.ObjectQuery<Recipient> {
        const where: ORM.ObjectQuery<Recipient> = basic;

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
        basic: ORM.FindOptions<Recipient, P, F> = {},
    ): ORM.FindOptions<Recipient, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Recipient>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
