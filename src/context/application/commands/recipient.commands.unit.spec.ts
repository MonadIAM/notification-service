import { describe, expect, it } from "@jest/globals";

import { ChannelType } from "~context/enums";
import { RecipientCommandsUnitHelpers } from "~testing/unit/command-services/recipient.helpers";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new RecipientCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const ID = "entity-a";

describe("RecipientCommands", () => {
    describe("create", () => {
        it("creates a recipient using the account's locale and timezone", async () => {
            const { commands, recipientService, transaction } = helpers.commands();
            const input = { account: ACCOUNT, locale: "ru", timezone: "Europe/Moscow" };

            await commands.create({ input, context: CONTEXT });

            expect(recipientService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        });
    });

    describe("update", () => {
        it("updates only the authenticated recipient's preferences", async () => {
            const { commands, recipientService, transaction } = helpers.commands();
            const input = { locale: "en" };

            await commands.update({ input, actor: ACTOR, context: CONTEXT });

            expect(recipientService.update.mock.calls).toEqual([
                [{ input: { patch: input, account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("selectOtpChannel", () => {
        it("binds OTP channel selection to the authenticated account", async () => {
            const { commands, recipientService, transaction } = helpers.commands();

            await commands.selectOtpChannel({ input: { channel: ID }, actor: ACTOR, context: CONTEXT });

            expect(recipientService.selectOtpChannel.mock.calls).toEqual([
                [{ input: { channel: ID, account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("purge", () => {
        it("purges the recipient requested by the consumer", async () => {
            const { commands, recipientService, transaction } = helpers.commands();

            await commands.purge({ input: { account: ACCOUNT }, context: CONTEXT });

            expect(recipientService.purge.mock.calls).toEqual([
                [{ input: { account: ACCOUNT }, transaction: transaction.entityManager }],
            ]);
        });

        it("consumes account deletion and purges the recipient in the same transaction", async () => {
            const { commands, recipientService, consume, run, transaction } = helpers.commands();
            const incoming = { consumerKey: "notification.account.v1", event: "purge-event" };
            await commands.purge({ input: { account: ACCOUNT }, incoming, context: CONTEXT });
            expect(run).not.toHaveBeenCalled();
            expect(consume).toHaveBeenCalledWith(expect.objectContaining({ incoming }));
            expect(recipientService.purge).toHaveBeenCalledWith({
                input: { account: ACCOUNT },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("confirm", () => {
        it("confirms the channel through idempotent Kafka consumption", async () => {
            const { commands, recipientService, consume, transaction } = helpers.commands();
            const incoming = { consumerKey: "notification.account.v1", event: "confirm-event" };
            await commands.confirm({
                input: { account: ACCOUNT, identifier: { id: ID, type: "email", value: "user@example.test" } },
                incoming,
                context: CONTEXT,
            });
            expect(consume).toHaveBeenCalledWith(expect.objectContaining({ incoming }));
            expect(transaction.flush).not.toHaveBeenCalled();
            expect(recipientService.ensureChannel).toHaveBeenCalledWith({
                input: {
                    account: ACCOUNT,
                    sourceIdentifier: ID,
                    address: "user@example.test",
                    type: ChannelType.EMAIL,
                    isVerified: true,
                },
                transaction: transaction.entityManager,
            });
        });
    });
});
