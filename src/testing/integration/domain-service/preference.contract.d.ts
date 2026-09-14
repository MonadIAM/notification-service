import type { PreferenceRepository } from "~context/infrastructure/repositories/preference.repository";
import type { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import type { PreferenceService } from "~context/domain/services/preference.service";

declare global {
    namespace Integration {
        namespace Domain {
            namespace Preference {
                type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

                interface Contract {
                    readonly repositories: Repositories.Signature;
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Context = {
                        readonly preferenceService: PreferenceService;
                        readonly repositories: Repositories.Context;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }

                namespace Repositories {
                    type Context = {
                        readonly preferences: PreferenceRepository;
                        readonly recipients: RecipientRepository;
                    };

                    type Signature = (context: Postgres.Suite.FactoryContext) => Context;
                }
            }
        }
    }
}
