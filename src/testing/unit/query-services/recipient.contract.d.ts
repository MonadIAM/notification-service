import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace RecipientQueries {
                interface Contract extends Domain.Core.Contract {
                    readonly queries: Queries.Signature;
                }

                namespace Queries {
                    type Result = {
                        readonly queries: globalThis.Queries.Recipient.Contract;
                        readonly recipientRepository: {
                            readonly findUniqueOrThrow: jest.Mock<
                                Repositories.Recipient.QueryContract["findUniqueOrThrow"]
                            >;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
