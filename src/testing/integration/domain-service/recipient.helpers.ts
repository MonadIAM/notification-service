import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import { RecipientService } from "~context/domain/services/recipient.service";

export class RecipientIntegrationHelpers implements Integration.Domain.Recipient.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Recipient.Service.Context {
        const repositories = this.repositories(context);

        return {
            recipientService: new RecipientService(repositories.recipients, repositories.channels),
            repositories,
        };
    }

    public repositories(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.Recipient.Repositories.Context {
        return {
            recipients: new RecipientRepository(context.readManager),
            channels: new ChannelRepository(context.readManager),
        };
    }
}
