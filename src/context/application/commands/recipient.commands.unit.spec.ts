import { describe, expect, it } from "@jest/globals";

import { RecipientCommandsUnitHelpers } from "~testing/unit/command-services/recipient.helpers";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new RecipientCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const ID = "entity-a";

describe("RecipientCommands", () => {
    it("creates a recipient using the account's locale and timezone", async () => {
        const { commands, recipientService, transaction } = helpers.commands();
        const input = { account: ACCOUNT, locale: "ru", timezone: "Europe/Moscow" };

        await commands.create({ input, context: CONTEXT });

        expect(recipientService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
    });

    it("updates only the authenticated recipient's preferences", async () => {
        const { commands, recipientService, transaction } = helpers.commands();
        const input = { locale: "en" };

        await commands.update({ input, actor: ACTOR, context: CONTEXT });

        expect(recipientService.update.mock.calls).toEqual([
            [{ input: { patch: input, account: ACTOR }, transaction: transaction.entityManager }],
        ]);
    });

    it("binds OTP channel selection to the authenticated account", async () => {
        const { commands, recipientService, transaction } = helpers.commands();

        await commands.selectOtpChannel({ input: { channel: ID }, actor: ACTOR, context: CONTEXT });

        expect(recipientService.selectOtpChannel.mock.calls).toEqual([
            [{ input: { channel: ID, account: ACTOR }, transaction: transaction.entityManager }],
        ]);
    });

    it("purges the recipient requested by the consumer", async () => {
        const { commands, recipientService, transaction } = helpers.commands();

        await commands.purge({ input: { account: ACCOUNT }, context: CONTEXT });

        expect(recipientService.purge.mock.calls).toEqual([
            [{ input: { account: ACCOUNT }, transaction: transaction.entityManager }],
        ]);
    });
});
