import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace MessageCommands {
                interface Contract extends CommandCore.Contract {
                    readonly commands: Commands.Signature;
                }

                namespace Commands {
                    type Result = CommandCore.Execution.Result & {
                        readonly commands: globalThis.Commands.Message.Contract;
                        readonly messageService: {
                            readonly markDelivered: jest.Mock<Services.Message.CommandContract["markDelivered"]>;
                            readonly markFailed: jest.Mock<Services.Message.CommandContract["markFailed"]>;
                            readonly markRead: jest.Mock<Services.Message.CommandContract["markRead"]>;
                            readonly markSent: jest.Mock<Services.Message.CommandContract["markSent"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
