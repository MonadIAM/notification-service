import { KafkaContext } from "@nestjs/microservices";

import { MessageDispatchAction } from "~context/enums";

declare global {
    namespace Consumers {
        namespace Account {
            type Message = Topics.Account.Message;

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace AccessCache {
            type Message = Topics.AccessCache.Message;

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Blacklist {
            type Message = Topics.Blacklist.Message;

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Reauthentication {
            type Message = Topics.Reauthentication.Message;

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Notification {
            type Message = Topics.Notification.Message;

            interface Contract extends InternalContract, PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                publish: Publish.Signature;
                process: Process.Signature;
                render: Render.Signature;
                reject: Reject.Signature;
            }

            namespace Publish {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    payload: Topics.Notification.NotificationSpec;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Render {
                type Props = {
                    payload: Topics.Notification.NotificationSpec;
                };

                type Result = Promise<Services.Notification.Create.Props["input"]>;

                type Signature = (props: Props) => Result;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace MessageDispatch {
            type Message = {
                actionType: MessageDispatchAction;
                payload: {
                    message: string;
                };
            };

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    incoming: TransactionManager.Service.IncomingMessage;
                    message: Message;
                    error: unknown;
                    terminal?: boolean;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Retry {
            type Message = Omit<Consumers.DLQ.Message, "payload"> & {
                payload: Consumers.MessageDispatch.Message;
            };

            interface Contract extends PublicContract, InternalContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, context: KafkaContext) => Result;
            }

            interface InternalContract {
                process: Process.Signature;
                reject: Reject.Signature;
            }

            namespace Process {
                type Props = {
                    context: KafkaContext;
                    message: Message;
                    event: string;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Reject {
                type Props = {
                    message: Message;
                    error: unknown;
                    event: string;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
