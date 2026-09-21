import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace NotificationCommands {
                interface Contract extends CommandCore.Contract {
                    readonly commands: Commands.Signature;
                }

                namespace Commands {
                    type Result = CommandCore.Execution.Result & {
                        readonly commands: globalThis.Commands.Notification.Contract;
                        readonly messageService: {
                            readonly markCancelled: jest.Mock<Services.Message.CommandContract["markCancelled"]>;
                        };
                        readonly notificationRepository: {
                            readonly findUnique: jest.Mock<Repositories.Notification.Contract["findUnique"]>;
                        };
                        readonly notificationService: {
                            readonly create: jest.Mock<Services.Notification.CommandContract["create"]>;
                        };
                        readonly dispatchDelayQueue: {
                            readonly cancel: jest.Mock<Queues.DispatchDelay.Contract["cancel"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
