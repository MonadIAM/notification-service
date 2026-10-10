import { describe, expect, it } from "@jest/globals";

import { RecipientCommandsUnitHelpers } from "~testing/unit/command-services/recipient.helpers";
import { ChannelType } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new RecipientCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Commands] - Recipient", () => {
    describe("[Method] - create", () => {
        it("[case] - creates a recipient using the account's locale and timezone", async () => {
            // Arrange
            const { commands, recipientService, transaction } = helpers.commands();
            const input = { account: ACCOUNT, locale: "ru", timezone: "Europe/Moscow" };

            // Act
            await commands.create({ input, context: CONTEXT });

            // Assert
            expect(recipientService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates only the authenticated recipient's preferences", async () => {
            // Arrange
            const { commands, recipientService, transaction } = helpers.commands();
            const input = { locale: "en" };

            // Act
            await commands.update({ input, actor: ACTOR, context: CONTEXT });

            // Assert
            expect(recipientService.update.mock.calls).toEqual([
                [{ input: { patch: input, account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("[Method] - selectOtpChannel", () => {
        it("[case] - binds OTP channel selection to the authenticated account", async () => {
            // Arrange
            const { commands, recipientService, transaction } = helpers.commands();

            // Act
            await commands.selectOtpChannel({ input: { channel: ID }, actor: ACTOR, context: CONTEXT });

            // Assert
            expect(recipientService.selectOtpChannel.mock.calls).toEqual([
                [{ input: { channel: ID, account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - purges the recipient requested by the consumer", async () => {
            // Arrange
            const { commands, recipientService, transaction } = helpers.commands();

            // Act
            await commands.purge({ input: { account: ACCOUNT }, context: CONTEXT });

            // Assert
            expect(recipientService.purge.mock.calls).toEqual([
                [{ input: { account: ACCOUNT }, transaction: transaction.entityManager }],
            ]);
        });

        it("[case] - consumes account deletion and purges the recipient in the same transaction", async () => {
            // Arrange
            const { commands, recipientService, consume, run, transaction } = helpers.commands();
            const incoming = { consumerKey: "notification.account.v1", event: "purge-event" };

            // Act
            await commands.purge({ input: { account: ACCOUNT }, incoming, context: CONTEXT });
            const result = run;
            const result1 = consume;

            // Assert
            expect(result).not.toHaveBeenCalled();
            expect(result1).toHaveBeenCalledWith(expect.objectContaining({ incoming }));
            expect(recipientService.purge).toHaveBeenCalledWith({
                input: { account: ACCOUNT },
                transaction: transaction.entityManager,
            });
        });
    });

    describe("[Method] - confirm", () => {
        it("[case] - confirms the channel through idempotent Kafka consumption", async () => {
            // Arrange
            const { commands, recipientService, consume, transaction } = helpers.commands();
            const incoming = { consumerKey: "notification.account.v1", event: "confirm-event" };

            // Act
            await commands.confirm({
                input: { account: ACCOUNT, identifier: { id: ID, type: "email", value: "user@example.test" } },
                incoming,
                context: CONTEXT,
            });
            const result = consume;
            const result1 = transaction.flush;

            // Assert
            expect(result).toHaveBeenCalledWith(expect.objectContaining({ incoming }));
            expect(result1).not.toHaveBeenCalled();
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
