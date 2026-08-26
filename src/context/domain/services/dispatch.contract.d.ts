declare namespace Services {
    namespace Dispatch {
        interface Contract extends CommandContract {}

        interface CommandContract {
            send: Send.Signature;
        }

        namespace Send {
            type Props = {
                message: Entities.Message;
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }
    }
}
