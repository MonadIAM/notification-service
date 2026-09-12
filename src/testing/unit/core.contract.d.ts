import { Collection } from "@mikro-orm/postgresql";
import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Domain {
            type Mock = ReturnType<typeof jest.fn>;

            namespace Core {
                interface Transaction {
                    readonly entityManager: ORM.EntityManager;
                    readonly persist: Mock;
                    readonly remove: Mock;
                    readonly flush: Mock;
                    readonly clear: Mock;
                    readonly merge: Mock;
                }

                interface Contract {
                    readonly createNotification: CreateNotification.Signature;
                    readonly createPreference: CreatePreference.Signature;
                    readonly createRecipient: CreateRecipient.Signature;
                    readonly createChangeLog: CreateChangeLog.Signature;
                    readonly transaction: TransactionFactory.Signature;
                    readonly createAuditLog: CreateAuditLog.Signature;
                    readonly collection: CollectionFactory.Signature;
                    readonly createChannel: CreateChannel.Signature;
                    readonly createMessage: CreateMessage.Signature;
                    readonly repositories: Repositories.Signature;
                    readonly services: Services.Signature;
                    readonly config: Config.Signature;
                }

                namespace TransactionFactory {
                    type Result = Transaction;

                    type Signature = () => Result;
                }

                namespace Config {
                    type Props = {
                        readonly values?: Record<string, unknown>;
                    };

                    type Result = ConfigService;

                    type Signature = (props?: Props) => Result;
                }

                namespace CollectionFactory {
                    type Props<T extends object> = {
                        readonly items: T[];
                        readonly owner: object;
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
                    type Props = Partial<SystemEntities.AuditLog>;

                    type Result = SystemEntities.AuditLog;

                    type Signature = (props?: Props) => Result;
                }

                namespace CreateChangeLog {
                    type Props = Partial<SystemEntities.ChangeLog>;

                    type Result = SystemEntities.ChangeLog;

                    type Signature = (props?: Props) => Result;
                }

                namespace Repositories {
                    type Props = {
                        readonly recipient?: Entities.Recipient;
                    };

                    type Result = RepositoryMocks.Contract;

                    type Signature = (props?: Props) => Result;
                }

                namespace Services {
                    type Result = ServiceMocks.Contract;

                    type Signature = () => Result;
                }
            }

            namespace RepositoryMocks {
                type Base = {
                    resource: string;

                    findUniqueOrThrow: Mock;
                    findUnique: Mock;
                    findMany: Mock;
                    find: Mock;
                };

                interface Contract {
                    readonly notifications: Base;
                    readonly preferences: Base;
                    readonly recipients: Base;
                    readonly changeLogs: Base;
                    readonly auditLogs: Base;
                    readonly channels: Base;
                    readonly messages: Base;
                }
            }

            namespace ServiceMocks {
                type Email = {
                    send: Mock;
                };

                type SMS = {
                    send: Mock;
                };

                interface Contract {
                    readonly email: Email;
                    readonly sms: SMS;
                }
            }
        }
    }
}
