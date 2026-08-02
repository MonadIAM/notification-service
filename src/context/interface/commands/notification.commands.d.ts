import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands {
        namespace Notification {
            interface InternalContract {
                messageDispatchPayloadMapper(
                    props: MessageDispatchPayloadMapper.Props,
                ): MessageDispatchPayloadMapper.Result;
            }

            interface ConsumerContract {
                create(props: Create.Props): Create.Result;
            }

            interface Contract extends InternalContract, ConsumerContract {}

            namespace Create {
                type Props = {
                    account: string;
                    category: NotificationCategory;
                    sourceService: PlatformService;
                    dedupKey?: string;
                    template: string;
                    realm?: string;
                    title?: string;
                    body?: string;
                };

                type Result = Promise<void>;
            }

            namespace MessageDispatchPayloadMapper {
                type Props = Entities.Message[];
                type Result = Consumers.MessageDispatch.Message["payload"][];
            }
        }
    }
}
