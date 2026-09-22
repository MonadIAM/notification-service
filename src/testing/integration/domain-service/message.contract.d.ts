declare namespace Integration.Domain.Message {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        repositories: Repositories.Signature;
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            messageService: Services.Message.Contract;
            repositories: Repositories.Context;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }

    namespace Repositories {
        type Context = {
            messages: globalThis.Repositories.Message.Contract;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
