import { KafkaContext } from "@nestjs/microservices";

import { MessageDispatchAction } from "~context/enums";

declare global {
    namespace Consumers {
        namespace AccessCache {
            interface Contract {
                handle(message: Message, ctx: KafkaContext): Promise<void>;
            }

            type Message = Topics.AccessCache.Message;
        }

        namespace Blacklist {
            interface Contract {
                handle(message: Message): Promise<void>;
            }

            type Message = Topics.Blacklist.Message;
        }

        namespace Reauthentication {
            interface Contract {
                handle(message: Message): Promise<void>;
            }

            type Message = Topics.Reauthentication.Message;
        }

        namespace Notification {
            interface InternalContract {
                publish(props: Publish.Props): Promise<void>;
            }

            interface Contract extends InternalContract {
                handle(message: Message, ctx: KafkaContext): Promise<void>;
            }

            type Message = Topics.Notification.Message;

            namespace Publish {
                type Props = {
                    payload: Topics.Notification.ContentPayload | Topics.Notification.TemplatePayload;
                };
            }
        }

        namespace MessageDispatch {
            interface Contract {
                handle(message: Message, ctx: KafkaContext): Promise<void>;
            }

            type Message = {
                actionType: MessageDispatchAction;
                payload: {
                    message: string;
                };
            };
        }
    }
}
