declare namespace Unit.Queries.Message {
    interface Contract extends Domain.Core.Contract {
        queries: Queries.Signature;
    }

    namespace Queries {
        type Result = {
            queries: globalThis.Queries.Message.Contract;
            messageRepository: {
                findUniqueOrThrow: Jest.Mock<Repositories.Message.QueryContract["findUniqueOrThrow"]>;
                findMany: Jest.Mock<Repositories.Message.QueryContract["findMany"]>;
            };
        };

        type Signature = () => Result;
    }
}
