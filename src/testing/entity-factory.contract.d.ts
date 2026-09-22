import { Collection } from "@mikro-orm/postgresql";

declare global {
    namespace Testing.EntityFactory {
        interface Contract {
            createNotification: CreateNotification.Signature;
            createPreference: CreatePreference.Signature;
            createRecipient: CreateRecipient.Signature;
            createChangeLog: CreateChangeLog.Signature;
            createAuditLog: CreateAuditLog.Signature;
            collection: CollectionFactory.Signature;
            createChannel: CreateChannel.Signature;
            createMessage: CreateMessage.Signature;
        }

        namespace CollectionFactory {
            type Props<T extends object> = {
                items: T[];
                owner: object;
            };

            type Signature = <T extends object>(props: Props<T>) => Collection<T>;
        }

        namespace CreateRecipient {
            type Props = Partial<Entities.Recipient.Contract>;

            type Result = Entities.Recipient;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateChannel {
            type Props = Partial<Entities.Channel.Contract>;

            type Result = Entities.Channel;

            type Signature = (props?: Props) => Result;
        }

        namespace CreatePreference {
            type Props = Partial<Entities.Preference.Contract>;

            type Result = Entities.Preference;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateNotification {
            type Props = Partial<Entities.Notification.Contract>;

            type Result = Entities.Notification;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateMessage {
            type Props = Partial<Entities.Message.Contract>;

            type Result = Entities.Message;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateAuditLog {
            type Props = Partial<SystemEntities.AuditLog> & {
                context?: Partial<SystemEntities.AuditLog.ConstructorProps["context"]>;
            };

            type Result = SystemEntities.AuditLog;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateChangeLog {
            type Props = Partial<SystemEntities.ChangeLog>;

            type Result = SystemEntities.ChangeLog;

            type Signature = (props?: Props) => Result;
        }
    }
}
