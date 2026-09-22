declare namespace Unit.Queries.Recipient {
    interface Contract extends Domain.Core.Contract {
        queries: Queries.Signature;
    }

    namespace Queries {
        type Result = {
            queries: globalThis.Queries.Recipient.Contract;
            recipientRepository: {
                findUniqueOrThrow: Jest.Mock<Repositories.Recipient.QueryContract["findUniqueOrThrow"]>;
            };
        };

        type Signature = () => Result;
    }
}
