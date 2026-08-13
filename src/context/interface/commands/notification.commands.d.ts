import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands {
        namespace Notification {
            interface Contract extends ConsumerContract {}

            interface ConsumerContract {
                create: Create.Signature;
                cancel: Cancel.Signature;
            }

            namespace Create {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        account: string;
                        category: NotificationCategory;
                        sourceService: PlatformService;
                        dedupKey?: string;
                        template: string;
                        realm?: string;
                        title?: string;
                        body?: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Cancel {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        dedupKey: string;
                    };
                };

                type Result = Promise<{ alreadyDispatched: boolean }>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
