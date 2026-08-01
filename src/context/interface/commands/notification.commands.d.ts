import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands {
        namespace Notification {
            interface ConsumerContract {
                create(props: Create.Props): Create.Result;
            }

            interface Contract extends ConsumerContract {}

            namespace Create {
                type Props = {
                    account: string;
                    category: NotificationCategory;
                    sourceService: PlatformService;
                    template: string;
                    realm?: string;
                    dedupKey?: string;
                    title?: string;
                    body?: string;
                };

                type Result = Promise<void>;
            }
        }
    }
}
