import { QueryOrder } from "@mikro-orm/postgresql";

import { NotificationCategory, PlatformService } from "~context/enums";
import { ORMAdapter } from "~infrastructure/database/utils";

export class NotificationMapper implements Repositories.Mappers.Contract<
    Entities.Notification,
    Repositories.Mappers.Notification.Types
> {
    public buildWhereORM(
        filters: Repositories.Mappers.Notification.Filters,
        basic: ORM.ObjectQuery<Entities.Notification> = {},
    ): ORM.ObjectQuery<Entities.Notification> {
        const where: ORM.ObjectQuery<Entities.Notification> = basic;

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
        sort: Repositories.Mappers.Notification.Sort,
        pagination: Pagination,
        basic: ORM.FindOptions<Entities.Notification, P, F> = {},
    ): ORM.FindOptions<Entities.Notification, P, F> {
        return {
            ...basic,
            orderBy: ORMAdapter.orderBy<Entities.Notification>(sort, { createdAt: QueryOrder.ASC }),
            ...ORMAdapter.pagination(pagination),
        };
    }
}
