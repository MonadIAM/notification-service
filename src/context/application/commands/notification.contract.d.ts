import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands {
        namespace Notification {
            interface Contract extends ConsumerContract {}

            interface ConsumerContract {
                create: Create.Signature;
                register: Register.Signature;
                cancel: Cancel.Signature;
            }

            namespace Create {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    context: Extract.Meta;
                    actor?: string;
                    realm?: string;
                    input: {
                        category: NotificationCategory;
                        sourceService: PlatformService;
                        dedupKey?: string;
                        template: string;
                        account: string;
                        realm?: string;
                        title?: string;
                        body?: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Register {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    context: Extract.Meta;
                    input: {
                        account: string;
                        identifier: Topics.Account.Identifier;
                        title: string;
                        body: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Cancel {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    context: Extract.Meta;
                    actor?: string;
                    realm?: string;
                    input: {
                        override: Services.Notification.Create.Props["input"];
                        dedupKey: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
