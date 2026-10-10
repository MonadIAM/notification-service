import { NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Entities {
        type Notification = Notification.Contract;

        namespace Notification {
            interface Contract {
                id: string;
                createdAt: Date;
                version: number;

                category: NotificationCategory;
                sourceService: PlatformService;
                dedupKey?: string;
                template: string;
                realm?: string;
                title?: string;
                body?: string;

                recipient: Entities.Recipient;
                messages: ORM.Collection<Entities.Message>;
            }

            type ConstructorProps = {
                recipient: Entities.Recipient;
                category: NotificationCategory;
                sourceService: PlatformService;
                realm?: string;
                dedupKey?: string;
                template: string;
                title?: string;
                body?: string;
            };
        }
    }
}
