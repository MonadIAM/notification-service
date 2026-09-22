declare namespace Unit.Commands.Preference {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            commands: globalThis.Commands.Preference.Contract;
            preferenceService: Jest.Mocked<Pick<Services.Preference.CommandContract, "toggle">>;
        };

        type Signature = () => Result;
    }
}
