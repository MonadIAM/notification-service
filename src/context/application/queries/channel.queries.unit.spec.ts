import { describe, expect, it } from "@jest/globals";

import { ChannelQueriesUnitHelpers } from "~testing/unit/query-services/channel.helpers";
import { QueryMode } from "~context/enums";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new ChannelQueriesUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Queries] - Channel", () => {
    describe("[Behavior] - record lookup", () => {
        it.each([
            { mode: QueryMode.DEFAULT, scope: { recipient: { account: ACTOR } } },
            { mode: QueryMode.MANAGE, scope: {} },
        ])("[case] - $mode enforces the appropriate ownership scope on single and paged reads", async ({ mode, scope }) => {
            // Arrange
            const { queries, channelRepository: repository } = helpers.queries();
            repository.findUniqueOrThrow.mockResolvedValue(helpers.createChannel());
            repository.findMany.mockResolvedValue([[], 0]);

            // Act
            await queries.findUnique({ mode, actor: ACTOR, channel: ID });
            await queries.findMany({ mode, actor: ACTOR, pagination: PAGINATION, filters: {}, sort: {} });
            const result = repository.findUniqueOrThrow.mock.calls;

            // Assert
            expect(result).toEqual([[expect.objectContaining({ where: { id: ID, ...scope } })]]);
            expect(repository.findMany.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ prefilter: scope }));
        });
    });
});
