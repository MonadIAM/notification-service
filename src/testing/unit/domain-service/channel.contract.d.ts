import type { ChannelService } from "~context/domain/services/channel.service";

declare global {
    namespace Unit {
        namespace Domain {
            namespace Channel {
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
                        readonly service: ChannelService;
                    };

                    type Signature = (props?: Props) => Result;
                }
            }
        }
    }
}
