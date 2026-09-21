import { jest } from "@jest/globals";

import { NotificationQueries } from "~context/application/queries/notification.queries";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class NotificationQueriesUnitHelpers
    extends DomainServiceCoreUnitHelpers
    implements Unit.Application.NotificationQueries.Contract
{
    public queries(): Unit.Application.NotificationQueries.Queries.Result {
        const notificationRepository = {
            findUniqueOrThrow: jest.fn<Repositories.Notification.QueryContract["findUniqueOrThrow"]>(),
            findMany: jest.fn<Repositories.Notification.QueryContract["findMany"]>(),
        };

        return {
            notificationRepository,
            queries: new NotificationQueries(
                this.contract<Repositories.Notification.QueryContract>(notificationRepository),
            ),
        };
    }
}
