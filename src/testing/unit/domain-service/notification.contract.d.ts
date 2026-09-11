import type { NotificationService } from "~context/domain/services/notification.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Notification {
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
                        readonly service: NotificationService;
                    };

                    type Signature = (props?: Props) => Result;
                }
            }
        }
    }
}
