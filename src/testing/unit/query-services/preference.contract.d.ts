declare namespace Unit.Queries.Preference {
    interface Contract extends Domain.Core.Contract {
        queries: Queries.Signature;
    }

    namespace Queries {
        type Result = {
            queries: globalThis.Queries.Preference.Contract;
            preferenceRepository: {
                findMany: Jest.Mock<Repositories.Preference.QueryContract["findMany"]>;
            };
        };

        type Signature = () => Result;
    }
}
