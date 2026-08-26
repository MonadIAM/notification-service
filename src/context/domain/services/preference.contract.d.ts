import { NotificationCategory, ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Preference {
            interface Contract extends CommandContract {}

            interface CommandContract {
                create: Create.Signature;
                toggle: Toggle.Signature;
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

                type Signature = (props: Props) => Result;
            }

            namespace Toggle {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        preference: Entities.Preference;
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
