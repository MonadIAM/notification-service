import { ConfigService } from "@nestjs/config";

declare global {
    namespace Unit.Domain {
        namespace Core {
            interface Transaction {
                entityManager: ORM.EntityManager;
                persist: Jest.Mock<(entity: object) => void>;
                remove: Jest.Mock;
                flush: Jest.Mock<() => Promise<void>>;
                clear: Jest.Mock;
                merge: Jest.Mock;
            }

            interface Contract extends Testing.EntityFactory.Contract {
                transaction: TransactionFactory.Signature;
                repositories: Repositories.Signature;
                services: Services.Signature;
                config: Config.Signature;
            }

            namespace TransactionFactory {
                type Result = Transaction;

                type Signature = () => Result;
            }

            namespace Config {
                type Props = {
                    values?: Record<string, unknown>;
                };

                type Result = ConfigService;

                type Signature = (props?: Props) => Result;
            }

            namespace Repositories {
                type Props = {
                    recipient?: Entities.Recipient;
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

                findUniqueOrThrow: Jest.Mock;
                findUnique: Jest.Mock;
                findMany: Jest.Mock;
                find: Jest.Mock;
            };

            interface Contract {
                notifications: Base;
                preferences: Base;
                recipients: Base;
                changeLogs: Base;
                auditLogs: Base;
                channels: Base;
                messages: Base;
            }
        }

        namespace ServiceMocks {
            type Email = Jest.Mocked<Pick<CommonServices.Email.PublicContract, "send">>;

            type SMS = Jest.Mocked<Pick<CommonServices.SMS.PublicContract, "send">>;

            interface Contract {
                email: Email;
                sms: SMS;
            }
        }
    }
}
