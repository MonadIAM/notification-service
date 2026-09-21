import { jest } from "@jest/globals";

import { MessageCommands } from "~context/application/commands/message.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class MessageCommandsUnitHelpers
    extends ApplicationCommandUnitHelpers
    implements Unit.Application.MessageCommands.Contract
{
    public commands(): Unit.Application.MessageCommands.Commands.Result {
        const execution = this.execution();

        const messageService = {
            markDelivered: jest.fn<Services.Message.CommandContract["markDelivered"]>(),
            markFailed: jest.fn<Services.Message.CommandContract["markFailed"]>(),
            markRead: jest.fn<Services.Message.CommandContract["markRead"]>(),
            markSent: jest.fn<Services.Message.CommandContract["markSent"]>(),
        };

        return {
            ...execution,
            messageService,
            commands: new MessageCommands(
                execution.transactional,
                this.contract<Services.Message.CommandContract>(messageService),
            ),
        };
    }
}
