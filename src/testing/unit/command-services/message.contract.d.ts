declare namespace Unit.Commands.Message {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            commands: globalThis.Commands.Message.Contract;
            messageService: Jest.Mocked<
                Pick<Services.Message.CommandContract, "markDelivered" | "markFailed" | "markRead" | "markSent">
            >;
        };

        type Signature = () => Result;
    }
}
