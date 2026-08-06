import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands {
        namespace Notification {
            interface Contract extends InternalContract, ConsumerContract {}

            interface InternalContract {
                messageDispatchPayloadMapper: MessageDispatchPayloadMapper.Signature;
            }

            namespace MessageDispatchPayloadMapper {
                type Props = Entities.Message[];

                type Result = Consumers.MessageDispatch.Message["payload"][];

                type Signature = (props: Props) => Result;
            }

            interface ConsumerContract {
                create: Create.Signature;
                cancel: Cancel.Signature;
            }

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

                type Signature = (props: Props) => Result;
            }

            namespace Cancel {
                type Props = {
                    dedupKey: string;
                };

                type Result = Promise<{ alreadyDispatched: boolean }>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
