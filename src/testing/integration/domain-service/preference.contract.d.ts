declare namespace Integration.Domain.Preference {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        repositories: Repositories.Signature;
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            preferenceService: Services.Preference.Contract;
            repositories: Repositories.Context;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }

    namespace Repositories {
        type Context = {
            preferences: globalThis.Repositories.Preference.Contract;
            recipients: globalThis.Repositories.Recipient.Contract;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
