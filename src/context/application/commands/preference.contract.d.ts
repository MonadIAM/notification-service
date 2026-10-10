import { NotificationCategory, ChannelType } from "~context/enums";

declare global {
    namespace Commands.Preference {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            toggle: Toggle.Signature;
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

            type Signature = (props: Props) => Result;
        }
    }
}
