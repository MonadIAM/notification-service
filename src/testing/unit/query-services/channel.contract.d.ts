declare namespace Unit.Queries.Channel {
    interface Contract extends Domain.Core.Contract {
        queries: Queries.Signature;
    }

    namespace Queries {
        type Result = {
            queries: globalThis.Queries.Channel.Contract;
            channelRepository: {
                findUniqueOrThrow: Jest.Mock<Repositories.Channel.QueryContract["findUniqueOrThrow"]>;
                findMany: Jest.Mock<Repositories.Channel.QueryContract["findMany"]>;
            };
        };

        type Signature = () => Result;
    }
}
