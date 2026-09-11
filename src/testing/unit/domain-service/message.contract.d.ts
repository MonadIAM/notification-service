import type { MessageService } from "~context/domain/services/message.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Message {
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
                        readonly service: MessageService;
                    };

                    type Signature = (props?: Props) => Result;
                }
            }
        }
    }
}
