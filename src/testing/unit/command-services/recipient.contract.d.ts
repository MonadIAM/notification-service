declare namespace Unit.Commands.Recipient {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            commands: globalThis.Commands.Recipient.Contract;
            recipientService: Jest.Mocked<
                Pick<Services.Recipient.CommandContract, "selectOtpChannel" | "create" | "update" | "purge">
            >;
        };

        type Signature = () => Result;
    }
}
