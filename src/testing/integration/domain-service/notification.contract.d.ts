import type { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import type { NotificationService } from "~context/domain/services/notification.service";

declare global {
    namespace Integration {
        namespace Domain {
            namespace Notification {
                type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

                interface Contract {
                    readonly repositories: Repositories.Signature;
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Context = {
                        readonly notificationService: NotificationService;
                        readonly repositories: Repositories.Context;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }

                namespace Repositories {
                    type Context = {
                        readonly recipients: RecipientRepository;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }
            }
        }
    }
}
