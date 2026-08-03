declare namespace Services {
    namespace Dispatch {
        interface Contract {
            send(props: Send.Props): Send.Result;
        }

        namespace Send {
            type Props = {
                message: Entities.Message;
            };

            type Result = Promise<void>;
        }
    }
}
