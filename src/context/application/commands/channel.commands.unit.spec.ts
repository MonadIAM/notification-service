import { describe, expect, it } from "@jest/globals";

import { ChannelCommandsUnitHelpers } from "~testing/unit/command-services/channel.helpers";
import { ChannelType } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new ChannelCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const ID = "entity-a";

describe("ChannelCommands", () => {
    describe("create", () => {
        it("creates an external channel with its source identifier", async () => {
            const { commands, channelService, transaction } = helpers.commands();
            const input = { sourceIdentifier: ID, account: ACCOUNT, address: "mail@example.test", type: ChannelType.EMAIL };

            await commands.create({ input, context: CONTEXT });

            expect(channelService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        });
    });

    describe("markVerified / purge", () => {
        it.each(["markVerified", "purge"] as const)("targets the source identifier for %s", async (method) => {
            const { commands, channelService, transaction } = helpers.commands();

            await commands[method]({ input: { sourceIdentifier: ID }, context: CONTEXT });

            expect(channelService[method].mock.calls).toEqual([
                [{ input: { sourceIdentifier: ID }, transaction: transaction.entityManager }],
            ]);
        });
    });

    describe("toggleSound", () => {
        it("toggles sound only for the authenticated account", async () => {
            const { commands, channelService, transaction } = helpers.commands();

            await commands.toggleSound({ actor: ACTOR, context: CONTEXT });

            expect(channelService.toggleSound.mock.calls).toEqual([
                [{ input: { account: ACTOR }, transaction: transaction.entityManager }],
            ]);
        });
    });
});
