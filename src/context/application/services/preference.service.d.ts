import { NotificationCategory, ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Preference {
            interface Contract {
                create(props: Create.Props): Create.Result;
                toggle(props: Toggle.Props): Toggle.Result;
            }

            namespace Create {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        category: NotificationCategory;
                        isDuplicationEnabled?: boolean;
                        recipient: Entities.Recipient;
                        channelType: ChannelType;
                    };
                };

                type Result = Entities.Preference;
            }

            namespace Toggle {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        preference: Entities.Preference;
                    };
                };

                type Result = void;
            }
        }
    }
}
