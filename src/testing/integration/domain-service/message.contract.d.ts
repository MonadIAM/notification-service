import type { MessageRepository } from "~context/infrastructure/repositories/message.repository";
import type { MessageService } from "~context/domain/services/message.service";

declare global {
    namespace Integration {
        namespace Domain {
            namespace Message {
                type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

                interface Contract {
                    readonly repositories: Repositories.Signature;
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Context = {
                        readonly messageService: MessageService;
                        readonly repositories: Repositories.Context;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }

                namespace Repositories {
                    type Context = {
                        readonly messages: MessageRepository;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }
            }
        }
    }
}
