import type { DispatchService } from "~context/domain/services/dispatch.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Dispatch {
                interface Contract extends Core.Contract {
                    readonly service: Service.Signature;
                }

                namespace Service {
                    type Result = {
                        readonly services: ServiceMocks.Contract;
                        readonly transaction: Core.Transaction;
                        readonly service: DispatchService;
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
