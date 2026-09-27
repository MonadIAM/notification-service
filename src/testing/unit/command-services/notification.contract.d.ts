declare namespace Unit.Commands.Notification {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            notificationService: Jest.Mocked<Pick<Services.Notification.CommandContract, "create" | "register" | "cancel">>;
            commands: globalThis.Commands.Notification.Contract;
        };

        type Signature = () => Result;
    }
}
