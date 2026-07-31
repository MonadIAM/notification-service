import { NotificationCategory, ChannelType } from "~context/enums";

declare global {
    namespace Entities {
        type Preference = Preference.Contract;

        namespace Preference {
            interface Contract {
                id: string;
                updatedAt?: Date;
                createdAt: Date;
                version: number;

                channelType: ChannelType;
                category: NotificationCategory;

                isEnabled: boolean;

                recipient: Entities.Recipient;
            }

            type ConstructorProps = {
                category: NotificationCategory;
                channelType: ChannelType;

                isEnabled?: boolean;

                recipient: Entities.Recipient;
            };
        }
    }
}
