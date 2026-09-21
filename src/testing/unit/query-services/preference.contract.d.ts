import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace PreferenceQueries {
                interface Contract extends Domain.Core.Contract {
                    readonly queries: Queries.Signature;
                }

                namespace Queries {
                    type Result = {
                        readonly queries: globalThis.Queries.Preference.Contract;
                        readonly preferenceRepository: {
                            readonly findMany: jest.Mock<Repositories.Preference.QueryContract["findMany"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
