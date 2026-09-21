import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace ChannelQueries {
                interface Contract extends Domain.Core.Contract {
                    readonly queries: Queries.Signature;
                }

                namespace Queries {
                    type Result = {
                        readonly queries: globalThis.Queries.Channel.Contract;
                        readonly channelRepository: {
                            readonly findUniqueOrThrow: jest.Mock<Repositories.Channel.QueryContract["findUniqueOrThrow"]>;
                            readonly findMany: jest.Mock<Repositories.Channel.QueryContract["findMany"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
