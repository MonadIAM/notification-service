declare namespace Unit.Queries.Notification {
    interface Contract extends Domain.Core.Contract {
        queries: Queries.Signature;
    }

    namespace Queries {
        type Result = {
            queries: globalThis.Queries.Notification.Contract;
            notificationRepository: {
                findUniqueOrThrow: Jest.Mock<Repositories.Notification.QueryContract["findUniqueOrThrow"]>;
                findMany: Jest.Mock<Repositories.Notification.QueryContract["findMany"]>;
            };
        };

        type Signature = () => Result;
    }
}
