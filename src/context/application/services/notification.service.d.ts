import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Notification {
            interface Contract extends CommandContract {}

            interface CommandContract {
                resolveChannelTypes: ResolveChannelTypes.Signature;
                create: Create.Signature;
            }

            namespace ResolveChannelTypes {
                type Props = {
                    category: NotificationCategory;
                    recipient: Entities.Recipient;
                };

                type Result = ChannelType[];

                type Signature = (props: Props) => Result;
            }

            namespace Create {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        sourceService: PlatformService;
                        category: NotificationCategory;
                        recipient: Entities.Recipient;
                        dedupKey?: string;
                        template: string;
                        realm?: string;
                        title?: string;
                        body?: string;
                    };
                };

                type Result = {
                    notification: Entities.Notification;
                    messages: Entities.Message[];
                };

                type Signature = (props: Props) => Result;
            }
        }
    }
}
