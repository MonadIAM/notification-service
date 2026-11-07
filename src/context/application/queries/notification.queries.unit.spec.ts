import { describe, expect, it } from "@jest/globals";

import { NotificationQueriesUnitHelpers } from "~testing/unit/query-services/notification.helpers";
import { QueryMode, ChannelType, MessageStatus, PlatformService } from "~context/enums";
import { OTP_MESSAGE_TEMPLATES } from "~context/constants";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new NotificationQueriesUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Queries] - Notification", () => {
    describe("[Behavior] - record lookup", () => {
        it.each([
            {
                mode: QueryMode.DEFAULT,
                scope: {
                    recipient: { account: ACTOR },
                    template: {
                        $nin: [...OTP_MESSAGE_TEMPLATES],
                    },
                    messages: {
                        $some: { channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED },
                    },
                },
            },
            { mode: QueryMode.MANAGE, scope: {} },
        ])("[case] - $mode enforces the appropriate ownership scope on single and paged reads", async ({ mode, scope }) => {
            // Arrange
            const { queries, notificationRepository: repository } = helpers.queries();
            repository.findUniqueOrThrow.mockResolvedValue(helpers.createNotification());
            repository.findMany.mockResolvedValue([[], 0]);

            // Act
            await queries.findUnique({ mode, actor: ACTOR, notification: ID });
            await queries.findMany({ mode, actor: ACTOR, pagination: PAGINATION, filters: {}, sort: {} });
            const result = repository.findUniqueOrThrow.mock.calls;

            // Assert
            expect(result).toEqual([[expect.objectContaining({ where: { id: ID, ...scope } })]]);
            expect(repository.findMany.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ prefilter: scope }));
        });
    });
    it("[case] - exposes HR navigation identifiers without additional database reads", () => {
        // Arrange
        const { queries } = helpers.queries();
        const notification = helpers.createNotification({
            sourceService: PlatformService.HR_SERVICE,
            dedupKey: "hr:organization-id:request-id:ABSENCE:1:HR_REQUEST_APPROVED",
        });

        // Act
        const result = queries.mapNotification({ notification });

        // Assert
        expect(result).toMatchObject({ organizationId: "organization-id", requestId: "request-id" });
    });
});
