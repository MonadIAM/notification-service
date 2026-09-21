import type { jest } from "@jest/globals";

declare global {
    namespace Unit {
        namespace Application {
            namespace NotificationQueries {
                interface Contract extends Domain.Core.Contract {
                    readonly queries: Queries.Signature;
                }

                namespace Queries {
                    type Result = {
                        readonly queries: globalThis.Queries.Notification.Contract;
                        readonly notificationRepository: {
                            readonly findUniqueOrThrow: jest.Mock<
                                Repositories.Notification.QueryContract["findUniqueOrThrow"]
                            >;
                            readonly findMany: jest.Mock<Repositories.Notification.QueryContract["findMany"]>;
                        };
                    };

                    type Signature = () => Result;
                }
            }
        }
    }
}
