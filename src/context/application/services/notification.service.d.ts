import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Notification {
            interface Contract {
                resolveChannelTypes(props: ResolveChannelTypes.Props): ResolveChannelTypes.Result;
                create(props: Create.Props): Create.Result;
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

                type Result = Entities.Notification;
            }

            namespace ResolveChannelTypes {
                type Props = {
                    category: NotificationCategory;
                    recipient: Entities.Recipient;
                };

                type Result = ChannelType[];
            }
        }
    }
}
