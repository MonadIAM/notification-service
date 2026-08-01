import { FailureReason } from "~context/enums";

declare global {
    namespace Commands {
        namespace Message {
            interface ControllerContract {
                markRead(props: MarkRead.Props): MarkRead.Result;
            }

            interface ConsumerContract {
                markSent(props: MarkSent.Props): MarkSent.Result;
                markDelivered(props: MarkDelivered.Props): MarkDelivered.Result;
                markFailed(props: MarkFailed.Props): MarkFailed.Result;
            }

            interface Contract extends ControllerContract, ConsumerContract {}

            namespace MarkRead {
                type Props = {
                    context: Extract.Meta;
                    actor: string;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<MessageResult>;
            }

            namespace MarkSent {
                type Props = {
                    message: string;
                };

                type Result = Promise<void>;
            }

            namespace MarkDelivered {
                type Props = {
                    message: string;
                };

                type Result = Promise<void>;
            }

            namespace MarkFailed {
                type Props = {
                    message: string;
                    reason: FailureReason;
                    error?: string;
                };

                type Result = Promise<void>;
            }
        }
    }
}
