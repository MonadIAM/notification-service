import { describe, expect, it } from "@jest/globals";

import { MessageCommandsUnitHelpers } from "~testing/unit/command-services/message.helpers";
import { FailureReason } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new MessageCommandsUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Commands] - Message", () => {
    describe("[Method] - markRead", () => {
        it("[case] - passes the authenticated reader to the domain check", async () => {
            // Arrange
            const { commands, messageService, transaction } = helpers.commands();

            // Act
            await commands.markRead({ input: { message: ID }, actor: ACTOR, context: CONTEXT });

            // Assert
            expect(messageService.markRead.mock.calls).toEqual([
                [{ input: { message: ID, actor: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("[Behavior] - delivery status", () => {
        it.each(["markSent", "markDelivered"] as const)(
            "[case] - applies %s to the requested message in a transaction",
            async (method) => {
                // Arrange
                const { commands, messageService, transaction } = helpers.commands();

                // Act
                await commands[method]({ input: { message: ID }, context: CONTEXT });

                // Assert
                expect(messageService[method].mock.calls).toEqual([
                    [{ input: { message: ID }, transaction: transaction.entityManager }],
                ]);
            },
        );
    });

    describe("[Method] - markFailed", () => {
        it("[case] - retains the provider failure details", async () => {
            // Arrange
            const { commands, messageService, transaction } = helpers.commands();
            const input = { message: ID, reason: FailureReason.PROVIDER, error: "provider unavailable" };

            // Act
            await commands.markFailed({ input, context: CONTEXT });

            // Assert
            expect(messageService.markFailed.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        });
    });
});
