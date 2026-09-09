import { FailureReason } from "~context/enums";

declare global {
    namespace Services {
        namespace Message {
            interface Contract extends CommandContract {}

            interface CommandContract {
                markCancelled: MarkCancelled.Signature;
                markDelivered: MarkDelivered.Signature;
                markFailed: MarkFailed.Signature;
                markSent: MarkSent.Signature;
                markRead: MarkRead.Signature;
            }

            namespace MarkCancelled {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        messages: Entities.Message[];
                    };
                };

                type Result = void;

                type Signature = (props: Props) => Result;
            }

            namespace MarkDelivered {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace MarkFailed {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        reason: FailureReason;
                        message: string;
                        error?: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace MarkSent {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace MarkRead {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        message: string;
                        actor: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
