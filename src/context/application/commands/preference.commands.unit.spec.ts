import { describe, expect, it } from "@jest/globals";

import { PreferenceCommandsUnitHelpers } from "~testing/unit/command-services/preference.helpers";
import { ChannelType, NotificationCategory } from "~context/enums";

const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new PreferenceCommandsUnitHelpers();
const ACTOR = "actor-account";

describe("PreferenceCommands", () => {
    it("binds preference changes to the authenticated recipient", async () => {
        const { commands, preferenceService, transaction } = helpers.commands();
        const input = { channelType: ChannelType.EMAIL, category: NotificationCategory.INVITES };

        await commands.toggle({ input, actor: ACTOR, context: CONTEXT });

        expect(preferenceService.toggle.mock.calls).toEqual([
            [{ input: { ...input, account: ACTOR }, transaction: transaction.entityManager }],
        ]);
    });
});
