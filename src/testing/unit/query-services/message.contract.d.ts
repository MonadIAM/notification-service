import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace MessageQueries {
                interface Contract extends Domain.Core.Contract {
                    readonly queries: Queries.Signature;
                }

                namespace Queries {
                    type Result = {
                        readonly queries: globalThis.Queries.Message.Contract;
                        readonly messageRepository: {
                            readonly findUniqueOrThrow: jest.Mock<Repositories.Message.QueryContract["findUniqueOrThrow"]>;
                            readonly findMany: jest.Mock<Repositories.Message.QueryContract["findMany"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
