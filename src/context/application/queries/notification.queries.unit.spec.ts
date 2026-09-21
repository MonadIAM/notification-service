import { describe, expect, it } from "@jest/globals";

import { NotificationQueriesUnitHelpers } from "~testing/unit/query-services/notification.helpers";
import { QueryMode, ChannelType, MessageStatus } from "~context/enums";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new NotificationQueriesUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("NotificationQueries", () => {
    it.each([
        {
            mode: QueryMode.DEFAULT,
            scope: {
                recipient: { account: ACTOR },
                messages: { channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED },
            },
        },
        { mode: QueryMode.MANAGE, scope: {} },
    ])("%s enforces the appropriate ownership scope on single and paged reads", async ({ mode, scope }) => {
        const { queries, notificationRepository: repository } = helpers.queries();
        repository.findUniqueOrThrow.mockResolvedValue(helpers.createNotification());
        repository.findMany.mockResolvedValue([[], 0]);

        await queries.findUnique({ mode, actor: ACTOR, notification: ID });
        await queries.findMany({ mode, actor: ACTOR, pagination: PAGINATION, filters: {}, sort: {} });

        expect(repository.findUniqueOrThrow.mock.calls).toEqual([
            [expect.objectContaining({ where: { id: ID, ...scope } })],
        ]);
        expect(repository.findMany.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ prefilter: scope }));
    });
});
