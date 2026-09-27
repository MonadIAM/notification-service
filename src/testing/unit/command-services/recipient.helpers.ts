import { jest } from "@jest/globals";

import { RecipientCommands } from "~context/application/commands/recipient.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class RecipientCommandsUnitHelpers
    extends ApplicationCommandUnitHelpers
    implements Unit.Commands.Recipient.Contract
{
    public commands(): Unit.Commands.Recipient.Commands.Result {
        const execution = this.execution();

        const recipientService = {
            ensureChannel: jest.fn<Services.Recipient.CommandContract["ensureChannel"]>(),
            create: jest.fn<Services.Recipient.CommandContract["create"]>(),
            update: jest.fn<Services.Recipient.CommandContract["update"]>(),
            selectOtpChannel: jest.fn<Services.Recipient.CommandContract["selectOtpChannel"]>(),
            purge: jest.fn<Services.Recipient.CommandContract["purge"]>(),
        };

        return {
            ...execution,
            recipientService,
            commands: new RecipientCommands(
                execution.transactional,
                this.contract<Services.Recipient.CommandContract>(recipientService),
            ),
        };
    }
}
