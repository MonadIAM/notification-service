import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace PreferenceCommands {
                interface Contract extends CommandCore.Contract {
                    readonly commands: Commands.Signature;
                }

                namespace Commands {
                    type Result = CommandCore.Execution.Result & {
                        readonly commands: globalThis.Commands.Preference.Contract;
                        readonly preferenceService: {
                            readonly toggle: jest.Mock<Services.Preference.CommandContract["toggle"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
