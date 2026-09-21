import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace RecipientCommands {
                interface Contract extends CommandCore.Contract {
                    readonly commands: Commands.Signature;
                }

                namespace Commands {
                    type Result = CommandCore.Execution.Result & {
                        readonly commands: globalThis.Commands.Recipient.Contract;
                        readonly recipientService: {
                            readonly selectOtpChannel: jest.Mock<Services.Recipient.CommandContract["selectOtpChannel"]>;
                            readonly create: jest.Mock<Services.Recipient.CommandContract["create"]>;
                            readonly update: jest.Mock<Services.Recipient.CommandContract["update"]>;
                            readonly purge: jest.Mock<Services.Recipient.CommandContract["purge"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
