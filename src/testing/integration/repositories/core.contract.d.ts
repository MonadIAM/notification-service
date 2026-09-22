import { FailureReason, MessageStatus } from "~context/enums";

declare global {
    namespace Fixtures.Core {
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
            type Props = Partial<Entities.Channel.ConstructorProps> & {
                recipient: Entities.Recipient;
            };

            type Result = Promise<Entities.Channel>;

            type Signature = (props: Props) => Result;
        }

        namespace CreateNotification {
            type Props = Partial<Entities.Notification.ConstructorProps> & {
                recipient: Entities.Recipient;
            };

            type Result = Promise<Entities.Notification>;

            type Signature = (props: Props) => Result;
        }

        namespace CreateMessage {
            type Props = Partial<Entities.Message.ConstructorProps> & {
                notification: Entities.Notification;
                failureReason?: FailureReason;
                status?: MessageStatus;
                error?: string;
            };

            type Result = Promise<Entities.Message>;

            type Signature = (props: Props) => Result;
        }

        namespace CreatePreference {
            type Props = Partial<Entities.Preference.ConstructorProps> & {
                recipient: Entities.Recipient;
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
