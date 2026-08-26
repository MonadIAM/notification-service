import { ChannelType } from "~context/enums";

declare global {
    namespace Commands {
        namespace Channel {
            interface Contract extends ControllerContract, ConsumerContract {}

            interface ControllerContract {
                toggleSound: ToggleSound.Signature;
            }

            namespace ToggleSound {
                type Props = {
                    context: Extract.Meta;
                    actor: string;
                };

                type Result = Promise<MessageResult>;

                type Signature = (props: Props) => Result;
            }

            interface ConsumerContract {
                markVerified: MarkVerified.Signature;
                create: Create.Signature;
                purge: Purge.Signature;
            }

            namespace MarkVerified {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        sourceIdentifier: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Create {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        account: string;
                        sourceIdentifier: string;
                        type: ChannelType;
                        address?: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Purge {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        sourceIdentifier: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
