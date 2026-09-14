import { TransactionalHelper } from "~testing/integration/transaction-manager/transactional.helpers";
import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import { RecipientCommands } from "~context/application/commands/recipient.commands";
import { RecipientService } from "~context/domain/services/recipient.service";

export class RecipientCommandIntegrationHelpers implements Integration.ApplicationCommand.Recipient.Contract {
    private readonly transactionalHelper = new TransactionalHelper();

    public service(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.ApplicationCommand.Recipient.Service.Context {
        const transactional = this.transactionalHelper.createTransactionalServiceContext({ orm: context.orm });
        const recipients = new RecipientRepository(context.readManager);
        const channels = new ChannelRepository(context.readManager);
        const recipientService = new RecipientService(recipients, channels);

        return {
            recipientCommands: new RecipientCommands(transactional.service, recipientService),
            transactionalService: transactional.service,
            readManager: transactional.readManager,
            recipients,
            channels,
        };
    }
}
