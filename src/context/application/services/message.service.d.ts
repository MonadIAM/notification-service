import { FailureReason } from "~context/enums";

declare global {
    namespace Services {
        namespace Message {
            interface Contract extends CommandContract {}

            interface CommandContract {
                markDelivered: MarkDelivered.Signature;
                markFailed: MarkFailed.Signature;
                markSent: MarkSent.Signature;
                markRead: MarkRead.Signature;
            }

            namespace MarkDelivered {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }

            namespace MarkFailed {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                        reason: FailureReason;
                        error?: string;
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }

            namespace MarkSent {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }

            namespace MarkRead {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
