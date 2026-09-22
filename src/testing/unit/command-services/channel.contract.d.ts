declare namespace Unit.Commands.Channel {
    interface Contract extends Core.Contract {
        commands: Commands.Signature;
    }

    namespace Commands {
        type Result = Core.Execution.Result & {
            commands: globalThis.Commands.Channel.Contract;
            channelService: Jest.Mocked<
                Pick<Services.Channel.CommandContract, "markVerified" | "toggleSound" | "create" | "purge">
            >;
        };

        type Signature = () => Result;
    }
}
