import { FailureReason } from "~context/enums";

declare global {
    namespace Commands {
        namespace Message {
            interface Contract extends ControllerContract, ConsumerContract {}

            interface ControllerContract {
                markRead: MarkRead.Signature;
            }

            namespace MarkRead {
                type Props = {
                    context: Extract.Meta;
                    actor: string;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<MessageResult>;

                type Signature = (props: Props) => Result;
            }

            interface ConsumerContract {
                markDelivered: MarkDelivered.Signature;
                markFailed: MarkFailed.Signature;
                markSent: MarkSent.Signature;
            }

            namespace MarkDelivered {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace MarkFailed {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        message: string;
                        reason: FailureReason;
                        error?: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace MarkSent {
                type Props = {
                    context: Extract.Meta;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
