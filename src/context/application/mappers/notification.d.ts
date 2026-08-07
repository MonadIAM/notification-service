declare namespace Commands {
    namespace Mappers {
        namespace Notification {
            interface Contract extends PublicContract {}

            interface PublicContract {
                messageDispatchPayload: MessageDispatchPayload.Signature;
            }

            namespace MessageDispatchPayload {
                type Props = {
                    messages: Entities.Message[];
                };

                type Result = Consumers.MessageDispatch.Message["payload"][];

                type Signature = (props: Props) => Result;
            }
        }
    }
}
