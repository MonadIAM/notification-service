import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace ChannelCommands {
                interface Contract extends CommandCore.Contract {
                    readonly commands: Commands.Signature;
                }

                namespace Commands {
                    type Result = CommandCore.Execution.Result & {
                        readonly commands: globalThis.Commands.Channel.Contract;
                        readonly channelService: {
                            readonly markVerified: jest.Mock<Services.Channel.CommandContract["markVerified"]>;
                            readonly toggleSound: jest.Mock<Services.Channel.CommandContract["toggleSound"]>;
                            readonly create: jest.Mock<Services.Channel.CommandContract["create"]>;
                            readonly purge: jest.Mock<Services.Channel.CommandContract["purge"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
