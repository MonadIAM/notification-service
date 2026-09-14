import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import { ChannelService } from "~context/domain/services/channel.service";

export class ChannelIntegrationHelpers implements Integration.Domain.Channel.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Channel.Service.Context {
        const repositories = this.repositories(context);

        return {
            channelService: new ChannelService(repositories.recipients, repositories.channels),
            repositories,
        };
    }

    public repositories(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.Channel.Repositories.Context {
        return {
            recipients: new RecipientRepository(context.readManager),
            channels: new ChannelRepository(context.readManager),
        };
    }
}
