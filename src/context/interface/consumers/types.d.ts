import { KafkaContext } from "@nestjs/microservices";

import { MessageDispatchAction } from "~context/enums";

declare global {
    namespace Consumers {
        namespace AccessCache {
            type Message = Topics.AccessCache.Message;

            interface Contract extends PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, ctx: KafkaContext) => Result;
            }
        }

        namespace Blacklist {
            type Message = Topics.Blacklist.Message;

            interface Contract extends PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message) => Result;
            }
        }

        namespace Reauthentication {
            type Message = Topics.Reauthentication.Message;

            interface Contract extends PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message) => Result;
            }
        }

        namespace Notification {
            type Message = Topics.Notification.Message;

            interface Contract extends InternalContract, PublicContract {}

            interface InternalContract {
                publish: Publish.Signature;
            }

            namespace Publish {
                type Props = {
                    payload: Topics.Notification.NotificationSpec;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, ctx: KafkaContext) => Result;
            }
        }

        namespace MessageDispatch {
            type Message = {
                actionType: MessageDispatchAction;
                payload: {
                    message: string;
                };
            };

            interface Contract extends PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, ctx: KafkaContext) => Result;
            }
        }

        namespace Retry {
            type Message = Consumers.DLQ.Message;

            interface Contract extends PublicContract {}

            interface PublicContract {
                handle: Handle.Signature;
            }

            namespace Handle {
                type Result = Promise<void>;

                type Signature = (message: Message, ctx: KafkaContext) => Result;
            }
        }
    }
}
