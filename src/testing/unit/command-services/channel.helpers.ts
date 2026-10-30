import { jest } from "@jest/globals";

import { ChannelCommands } from "~context/application/commands/channel.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class ChannelCommandsUnitHelpers extends ApplicationCommandUnitHelpers implements Unit.Commands.Channel.Contract {
    public commands(): Unit.Commands.Channel.Commands.Result {
        const execution = this.execution();

        const channelService = {
            purgeEmail: jest.fn<Services.Channel.CommandContract["purgeEmail"]>(),
            selectEmail: jest.fn<Services.Channel.CommandContract["selectEmail"]>(),
            confirmEmail: jest.fn<Services.Channel.CommandContract["confirmEmail"]>(),
            markVerified: jest.fn<Services.Channel.CommandContract["markVerified"]>(),
            toggleSound: jest.fn<Services.Channel.CommandContract["toggleSound"]>(),
            create: jest.fn<Services.Channel.CommandContract["create"]>(),
            purge: jest.fn<Services.Channel.CommandContract["purge"]>(),
        };

        return {
            ...execution,
            channelService,
            commands: new ChannelCommands(
                execution.transactional,
                this.contract<Services.Channel.CommandContract>(channelService),
            ),
        };
    }
}
