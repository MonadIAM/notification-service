import { describe, expect, it } from "@jest/globals";

import { MessageQueriesUnitHelpers } from "~testing/unit/query-services/message.helpers";
import { QueryMode, ChannelType, MessageStatus } from "~context/enums";
import { OTP_MESSAGE_TEMPLATES } from "~context/constants";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new MessageQueriesUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Queries] - Message", () => {
    describe("[Method] - findMany", () => {
        it("[case] - exposes only delivered in-app messages belonging to the actor's notification", async () => {
            // Arrange
            const { queries, messageRepository } = helpers.queries();
            messageRepository.findMany.mockResolvedValue([[], 0]);

            // Act
            await queries.findMany({
                mode: QueryMode.DEFAULT,
                pagination: PAGINATION,
                notification: ID,
                actor: ACTOR,
                sort: {},
            });

            // Assert
            expect(messageRepository.findMany.mock.calls).toEqual([
                [
                    expect.objectContaining({
                        filters: {},
                        prefilter: {
                            notification: {
                                id: ID,
                                recipient: { account: ACTOR },
                                template: {
                                    $nin: [...OTP_MESSAGE_TEMPLATES],
                                },
                            },
                            channelType: ChannelType.IN_APP,
                            status: MessageStatus.DELIVERED,
                        },
                    }),
                ],
            ]);
        });
    });

    describe("[Behavior] - record lookup", () => {
        it("[case] - allows management to retrieve delivery records independently of inbox visibility", async () => {
            // Arrange
            const { queries, messageRepository } = helpers.queries();
            messageRepository.findMany.mockResolvedValue([[], 0]);
            const message = helpers.createMessage();
            messageRepository.findUniqueOrThrow.mockResolvedValue(message);

            // Act
            await queries.findMany({ mode: QueryMode.MANAGE, pagination: PAGINATION, filters: {}, sort: {} });
            const result = await queries.findUnique({ mode: QueryMode.MANAGE, message: ID });
            const result1 = messageRepository.findMany.mock.calls;
            const result2 = result;

            // Assert
            expect(result1).toEqual([[{ pagination: PAGINATION, filters: {}, sort: {} }]]);
            expect(result2).toBe(message);
            expect(messageRepository.findUniqueOrThrow.mock.calls).toEqual([[{ where: { id: ID } }]]);
        });
    });
});
