declare namespace Unit.Commands.Notification {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            notificationService: Jest.Mocked<Pick<Services.Notification.CommandContract, "create">>;
            messageService: Jest.Mocked<Pick<Services.Message.CommandContract, "markCancelled">>;
            commands: globalThis.Commands.Notification.Contract;
            notificationRepository: {
                findUnique: Jest.Mock<Repositories.Notification.Contract["findUnique"]>;
            };
            dispatchDelayQueue: {
                cancel: Jest.Mock<Queues.DispatchDelay.Contract["cancel"]>;
            };
        };

        type Signature = () => Result;
    }
}
