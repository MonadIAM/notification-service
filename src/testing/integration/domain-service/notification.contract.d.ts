declare namespace Integration.Domain.Notification {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        repositories: Repositories.Signature;
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            notificationService: Services.Notification.Contract;
            repositories: Repositories.Context;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }

    namespace Repositories {
        type Context = {
            recipients: globalThis.Repositories.Recipient.Contract;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
