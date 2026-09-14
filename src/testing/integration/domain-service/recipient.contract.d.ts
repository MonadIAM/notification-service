import type { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import type { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import type { RecipientService } from "~context/domain/services/recipient.service";

declare global {
    namespace Integration {
        namespace Domain {
            namespace Recipient {
                type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

                interface Contract {
                    readonly repositories: Repositories.Signature;
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Context = {
                        readonly recipientService: RecipientService;
                        readonly repositories: Repositories.Context;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }

                namespace Repositories {
                    type Context = {
                        readonly recipients: RecipientRepository;
                        readonly channels: ChannelRepository;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }
            }
        }
    }
}
