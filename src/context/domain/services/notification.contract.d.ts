import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";

declare global {
    namespace Services.Notification {
        interface Contract extends CommandContract {}

        interface CommandContract {
            resolveChannelTypes: ResolveChannelTypes.Signature;
            register: Register.Signature;
            create: Create.Signature;
            cancel: Cancel.Signature;
        }

        namespace ResolveChannelTypes {
            type Props = {
                category: NotificationCategory;
                recipient: Entities.Recipient;
            };

            type Result = ChannelType[];

            type Signature = (props: Props) => Result;
        }

        namespace Register {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    sourceIdentifier: string;
                    timezone?: string;
                    type: ChannelType;
                    language: string;
                    account: string;
                    address: string;
                    locale?: string;
                    title: string;
                    body: string;
                };
            };

            type Result = Create.Result;

            type Signature = (props: Props) => Result;
        }

        namespace Cancel {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    override: Create.Props["input"];
                    dedupKey: string;
                };
            };

            type Result = Promise<{ messages: Entities.Message[] }>;

            type Signature = (props: Props) => Result;
        }

        namespace Create {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    delivery?: Topics.Notification.Delivery;
                    sourceService: PlatformService;
                    category: NotificationCategory;
                    locale: Nullable<string>;
                    dedupKey?: string;
                    template: string;
                    account: string;
                    realm?: string;
                    title?: string;
                    body?: string;
                };
            };

            type Result = Promise<{
                notification: Entities.Notification;
                messages: Entities.Message[];
            }>;

            type Signature = (props: Props) => Result;
        }
    }
}
