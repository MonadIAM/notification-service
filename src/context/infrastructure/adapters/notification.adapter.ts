import { QueryOrder } from "@mikro-orm/postgresql";

import { NotificationCategory, PlatformService } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";
import { Notification } from "~context/domain/entities";

export class NotificationAdapter implements Adapters.Contract<Notification, Adapters.Notification.Types> {
    public buildWhereORM(
        filters: Adapters.Notification.Filters,
        basic: ORM.ObjectQuery<Notification> = {},
    ): ORM.ObjectQuery<Notification> {
        const where: ORM.ObjectQuery<Notification> = basic;

        if (filters.id) {
            where.id = ORMAdapter.applyStringFilter(filters.id);
        }
        if (filters.recipient) {
            where.recipient = ORMAdapter.applyStringFilter(filters.recipient);
        }
        if (filters.category) {
            where.category = ORMAdapter.applyStringFilter<NotificationCategory>(filters.category);
        }
        if (filters.realm) {
            where.realm = ORMAdapter.applyStringFilter(filters.realm);
        }
        if (filters.sourceService) {
            where.sourceService = ORMAdapter.applyStringFilter<PlatformService>(filters.sourceService);
        }
        if (filters.createdAt) {
            where.createdAt = ORMAdapter.applyOrdinalFilter<Date>(filters.createdAt);
        }

        return where;
    }

    public buildOptionsORM<P extends string = never, F extends string = "*">(
        sort: Adapters.Notification.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Notification, P, F> = {},
    ): ORM.FindOptions<Notification, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Notification>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
