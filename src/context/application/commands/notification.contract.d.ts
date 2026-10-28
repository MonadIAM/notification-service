import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Commands.Notification {
        interface Contract extends ConsumerContract {}

        interface ConsumerContract {
            register: Register.Signature;
            create: Create.Signature;
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
                    locale: Nullable<string>;
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
                    identifier: Topics.Account.Identifier;
                    language: string;
                    timezone?: string;
                    account: string;
                    locale?: string;
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
