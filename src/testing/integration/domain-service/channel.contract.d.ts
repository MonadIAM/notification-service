declare namespace Integration.Domain.Channel {
    type Suite = Postgres.Suite.Contract<Service.Context, Fixtures.Core.Contract>;

    interface Contract {
        repositories: Repositories.Signature;
        service: Service.Signature;
    }

    namespace Service {
        type Context = {
            channelService: Services.Channel.Contract;
            repositories: Repositories.Context;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }

    namespace Repositories {
        type Context = {
            recipients: globalThis.Repositories.Recipient.Contract;
            channels: globalThis.Repositories.Channel.Contract;
        };

        type Signature = (context: Postgres.Suite.FactoryContext) => Context;
    }
}
