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

                isDuplicationEnabled: boolean;

                recipient: Entities.Recipient;

                toggle(): void;
            }

            type ConstructorProps = {
                category: NotificationCategory;
                channelType: ChannelType;

                isDuplicationEnabled?: boolean;

                recipient: Entities.Recipient;
            };
        }
    }
}
