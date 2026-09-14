import type { TransactionalService } from "~common/transaction-manager/services/transactional.service";
import type { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import type { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import type { RecipientCommands } from "~context/application/commands/recipient.commands";

declare global {
    namespace Integration {
        namespace ApplicationCommand {
            namespace Recipient {
                type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

                interface Contract {
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Context = {
                        readonly transactionalService: TransactionalService;
                        readonly recipientCommands: RecipientCommands;
                        readonly recipients: RecipientRepository;
                        readonly readManager: ORM.EntityManager;
                        readonly channels: ChannelRepository;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }
            }
        }
    }
}
