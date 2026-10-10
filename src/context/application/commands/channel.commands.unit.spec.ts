import { describe, expect, it } from "@jest/globals";

import { ChannelCommandsUnitHelpers } from "~testing/unit/command-services/channel.helpers";
import { ChannelType } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new ChannelCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const ID = "entity-a";

describe("[Commands] - Channel", () => {
    describe("[Method] - create", () => {
        it("[case] - creates an external channel with its source identifier", async () => {
            // Arrange
            const { commands, channelService, transaction } = helpers.commands();
            const input = { sourceIdentifier: ID, account: ACCOUNT, address: "mail@example.test", type: ChannelType.EMAIL };

            // Act
            await commands.create({ input, context: CONTEXT });

            // Assert
            expect(channelService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        });
    });

    describe("[Behavior] - channel lifecycle", () => {
        it.each(["markVerified", "purge"] as const)("[case] - targets the source identifier for %s", async (method) => {
            // Arrange
            const { commands, channelService, transaction } = helpers.commands();

            // Act
            await commands[method]({ input: { sourceIdentifier: ID }, context: CONTEXT });

            // Assert
            expect(channelService[method].mock.calls).toEqual([
                [{ input: { sourceIdentifier: ID }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("[Method] - toggleSound", () => {
        it("[case] - toggles sound only for the authenticated account", async () => {
            // Arrange
            const { commands, channelService, transaction } = helpers.commands();

            // Act
            await commands.toggleSound({ actor: ACTOR, context: CONTEXT });

            // Assert
            expect(channelService.toggleSound.mock.calls).toEqual([
                [{ input: { account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });
});
