import { FailureReason, MessageStatus, ChannelType } from "~context/enums";

declare global {
    namespace Entities {
        type Message = Message.Contract;

        namespace Message {
            interface Contract {
                id: string;
                cancelledAt?: Date;
                deliveredAt?: Date;
                createdAt: Date;
                failedAt?: Date;
                readAt?: Date;
                sentAt?: Date;
                version: number;

                address: string;
                channelType: ChannelType;
                status: MessageStatus;
                retryCount: number;

                failureReason?: FailureReason;
                error?: string;

                notification: Entities.Notification;
                channel?: Entities.Channel;

                markFailed(props: MarkFailed.Props): void;
                markCancelled(): void;
                markDelivered(): void;
                markSent(): void;
                markRead(): void;
            }

            namespace MarkFailed {
                type Props = {
                    reason: FailureReason;
                    error?: string;
                };
            }

            type ConstructorProps = {
                channel?: Entities.Channel;
                notification: Entities.Notification;
                channelType: ChannelType;
                address: string;
            };
        }
    }
}
