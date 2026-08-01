import { FailureReason } from "~context/enums";

declare global {
    namespace Services {
        namespace Message {
            interface Contract {
                markDelivered(props: MarkDelivered.Props): MarkDelivered.Result;
                markFailed(props: MarkFailed.Props): MarkFailed.Result;
                markSent(props: MarkSent.Props): MarkSent.Result;
                markRead(props: MarkRead.Props): MarkRead.Result;
            }

            namespace MarkSent {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;
            }

            namespace MarkDelivered {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;
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
            }

            namespace MarkRead {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: Entities.Message;
                    };
                };

                type Result = void;
            }
        }
    }
}
