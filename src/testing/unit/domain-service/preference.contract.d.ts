import type { PreferenceService } from "~context/domain/services/preference.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Preference {
                interface Contract extends Core.Contract {
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Props = {
                        readonly recipient?: Entities.Recipient;
                    };

                    type Result = {
                        readonly repositories: RepositoryMocks.Contract;
                        readonly transaction: Core.Transaction;
                        readonly service: PreferenceService;
                    };

                    type Signature = (props?: Props) => Result;
                }
            }
        }
    }
}
