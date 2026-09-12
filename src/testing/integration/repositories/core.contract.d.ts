import { ChannelType, FailureReason, MessageStatus, NotificationCategory, PlatformService } from "~context/enums";

declare global {
    namespace Fixtures {
        namespace Core {
            interface Contract {
                createNotification: CreateNotification.Signature;
                createPreference: CreatePreference.Signature;
                createChangeLog: CreateChangeLog.Signature;
                createRecipient: CreateRecipient.Signature;
                createAuditLog: CreateAuditLog.Signature;
                createChannel: CreateChannel.Signature;
                createMessage: CreateMessage.Signature;
            }

            namespace CreateRecipient {
                type Props = Partial<Entities.Recipient.ConstructorProps> & {
                    createdAt?: Date;
                    updatedAt?: Date;
                };

                type Result = Promise<Entities.Recipient>;

                type Signature = (props?: Props) => Result;
            }

            namespace CreateChannel {
                type Props = Omit<Partial<Entities.Channel.ConstructorProps>, "recipient" | "type"> & {
                    recipient: Entities.Recipient;
                    type?: ChannelType;
                };

                type Result = Promise<Entities.Channel>;

                type Signature = (props: Props) => Result;
            }

            namespace CreateNotification {
                type Props = Omit<
                    Partial<Entities.Notification.ConstructorProps>,
                    "category" | "recipient" | "sourceService" | "template"
                > & {
                    category?: NotificationCategory;
                    sourceService?: PlatformService;
                    recipient: Entities.Recipient;
                    template?: string;
                };

                type Result = Promise<Entities.Notification>;

                type Signature = (props: Props) => Result;
            }

            namespace CreateMessage {
                type Props = Omit<
                    Partial<Entities.Message.ConstructorProps>,
                    "address" | "channelType" | "notification"
                > & {
                    notification: Entities.Notification;
                    failureReason?: FailureReason;
                    channelType?: ChannelType;
                    status?: MessageStatus;
                    address?: string;
                    error?: string;
                };

                type Result = Promise<Entities.Message>;

                type Signature = (props: Props) => Result;
            }

            namespace CreatePreference {
                type Props = Omit<
                    Partial<Entities.Preference.ConstructorProps>,
                    "category" | "channelType" | "recipient"
                > & {
                    category?: NotificationCategory;
                    recipient: Entities.Recipient;
                    channelType?: ChannelType;
                };

                type Result = Promise<Entities.Preference>;

                type Signature = (props: Props) => Result;
            }

            namespace CreateAuditLog {
                type Props = Omit<Partial<SystemEntities.AuditLog.ConstructorProps>, "context"> & {
                    context?: Partial<Extract.Meta>;
                };

                type Result = Promise<SystemEntities.AuditLog>;

                type Signature = (props?: Props) => Result;
            }

            namespace CreateChangeLog {
                type Props = Omit<Partial<SystemEntities.ChangeLog.ConstructorProps>, "auditEntry"> & {
                    auditEntry?: SystemEntities.AuditLog;
                };

                type Result = Promise<SystemEntities.ChangeLog>;

                type Signature = (props?: Props) => Result;
            }
        }
    }
}
