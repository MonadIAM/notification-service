import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { NotificationService } from "~context/domain/services/notification.service";

export class NotificationIntegrationHelpers implements Integration.Domain.Notification.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Notification.Service.Context {
        const repositories = this.repositories(context);

        return {
            notificationService: new NotificationService(repositories.recipients),
            repositories,
        };
    }

    public repositories(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.Notification.Repositories.Context {
        return {
            recipients: new RecipientRepository(context.readManager),
        };
    }
}
