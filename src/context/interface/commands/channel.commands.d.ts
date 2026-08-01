import { ChannelType } from "~context/enums";

declare global {
    namespace Commands {
        namespace Channel {
            interface ControllerContract {
                toggleSound(props: ToggleSound.Props): ToggleSound.Result;
            }

            interface ConsumerContract {
                create(props: Create.Props): Create.Result;
                markVerified(props: MarkVerified.Props): MarkVerified.Result;
                purge(props: Purge.Props): Purge.Result;
            }

            interface Contract extends ControllerContract, ConsumerContract {}

            namespace ToggleSound {
                type Props = {
                    context: Extract.Meta;
                    actor: string;
                };

                type Result = Promise<MessageResult>;
            }

            namespace Create {
                type Props = {
                    account: string;
                    sourceIdentifier: string;
                    type: ChannelType;
                    address?: string;
                };

                type Result = Promise<void>;
            }

            namespace MarkVerified {
                type Props = {
                    sourceIdentifier: string;
                };

                type Result = Promise<void>;
            }

            namespace Purge {
                type Props = {
                    sourceIdentifier: string;
                };

                type Result = Promise<void>;
            }
        }
    }
}
