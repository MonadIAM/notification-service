import { describe, expect, it } from "@jest/globals";

import { MessageQueriesUnitHelpers } from "~testing/unit/query-services/message.helpers";
import { QueryMode, ChannelType, MessageStatus } from "~context/enums";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new MessageQueriesUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("MessageQueries", () => {
    it("exposes only delivered in-app messages belonging to the actor's notification", async () => {
        const { queries, messageRepository } = helpers.queries();
        messageRepository.findMany.mockResolvedValue([[], 0]);

        await queries.findMany({
            mode: QueryMode.DEFAULT,
            pagination: PAGINATION,
            notification: ID,
            actor: ACTOR,
            sort: {},
        });

        expect(messageRepository.findMany.mock.calls).toEqual([
            [
                expect.objectContaining({
                    filters: {},
                    prefilter: {
                        notification: { id: ID, recipient: { account: ACTOR } },
                        channelType: ChannelType.IN_APP,
                        status: MessageStatus.DELIVERED,
                    },
                }),
            ],
        ]);
    });

    it("allows management to retrieve delivery records independently of inbox visibility", async () => {
        const { queries, messageRepository } = helpers.queries();
        messageRepository.findMany.mockResolvedValue([[], 0]);
        const message = helpers.createMessage();
        messageRepository.findUniqueOrThrow.mockResolvedValue(message);

        await queries.findMany({ mode: QueryMode.MANAGE, pagination: PAGINATION, filters: {}, sort: {} });
        const result = await queries.findUnique({ mode: QueryMode.MANAGE, message: ID });

        expect(messageRepository.findMany.mock.calls).toEqual([[{ pagination: PAGINATION, filters: {}, sort: {} }]]);
        expect(result).toBe(message);
        expect(messageRepository.findUniqueOrThrow.mock.calls).toEqual([[{ where: { id: ID } }]]);
    });
});
