import { NotificationCategory, ChannelType } from "~context/enums";

declare global {
    namespace Commands {
        namespace Preference {
            interface Contract {
                toggle(props: Toggle.Props): Toggle.Result;
            }

            namespace Toggle {
                type Props = {
                    context: Extract.Meta;
                    actor: string;
                    input: {
                        channelType: ChannelType;
                        category: NotificationCategory;
                    };
                };

                type Result = Promise<MessageResult>;
            }
        }
    }
}
