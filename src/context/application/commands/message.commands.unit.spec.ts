import { describe, expect, it } from "@jest/globals";

import { MessageCommandsUnitHelpers } from "~testing/unit/command-services/message.helpers";
import { FailureReason } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new MessageCommandsUnitHelpers();
const ACTOR = "actor-account";
const ID = "entity-a";

describe("MessageCommands", () => {
    it("passes the authenticated reader to the domain check", async () => {
        const { commands, messageService, transaction } = helpers.commands();

        await commands.markRead({ input: { message: ID }, actor: ACTOR, context: CONTEXT });

        expect(messageService.markRead.mock.calls).toEqual([
            [{ input: { message: ID, actor: ACTOR }, transaction: transaction.entityManager }],
        ]);
    });

    it.each(["markSent", "markDelivered"] as const)(
        "applies %s to the requested message in a transaction",
        async (method) => {
            const { commands, messageService, transaction } = helpers.commands();

            await commands[method]({ input: { message: ID }, context: CONTEXT });

            expect(messageService[method].mock.calls).toEqual([
                [{ input: { message: ID }, transaction: transaction.entityManager }],
            ]);
        },
    );

    it("retains the provider failure details", async () => {
        const { commands, messageService, transaction } = helpers.commands();
        const input = { message: ID, reason: FailureReason.PROVIDER, error: "provider unavailable" };

        await commands.markFailed({ input, context: CONTEXT });

        expect(messageService.markFailed.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
    });
});
