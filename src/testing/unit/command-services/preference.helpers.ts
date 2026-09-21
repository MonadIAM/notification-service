import { jest } from "@jest/globals";

import { PreferenceCommands } from "~context/application/commands/preference.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class PreferenceCommandsUnitHelpers
    extends ApplicationCommandUnitHelpers
    implements Unit.Application.PreferenceCommands.Contract
{
    public commands(): Unit.Application.PreferenceCommands.Commands.Result {
        const execution = this.execution();

        const preferenceService = {
            toggle: jest.fn<Services.Preference.CommandContract["toggle"]>(),
        };

        return {
            ...execution,
            preferenceService,
            commands: new PreferenceCommands(
                execution.transactional,
                this.contract<Services.Preference.CommandContract>(preferenceService),
            ),
        };
    }
}
