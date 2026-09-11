import type { RecipientService } from "~context/domain/services/recipient.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Recipient {
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
                        readonly service: RecipientService;
                    };

                    type Signature = (props?: Props) => Result;
                }
            }
        }
    }
}
