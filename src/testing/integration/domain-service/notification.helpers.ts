import { MessageService } from "~context/domain/services/message.service";
import { MessageRepository } from "~context/infrastructure/repositories/message.repository";
import { NotificationRepository } from "~context/infrastructure/repositories/notification.repository";
import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { RecipientService } from "~context/domain/services/recipient.service";
import { ChannelService } from "~context/domain/services/channel.service";
import { ChannelRepository } from "~context/infrastructure/repositories/channel.repository";
import { NotificationService } from "~context/domain/services/notification.service";

export class NotificationIntegrationHelpers implements Integration.Domain.Notification.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Notification.Service.Context {
        const repositories = this.repositories(context);
        const dispatchDelayQueue: Queues.DispatchDelay.Contract = {
            schedule: () => Promise.reject(new Error("Dispatch queue is not available in PostgreSQL tests")),
            cancel: () => Promise.reject(new Error("Dispatch queue is not available in PostgreSQL tests")),
        };
        const channels = new ChannelRepository(context.readManager);

        return {
            notificationService: new NotificationService(
                repositories.recipients,
                new RecipientService(
                    repositories.recipients,
                    channels,
                    new ChannelService(repositories.recipients, channels),
                ),
                new NotificationRepository(context.readManager),
                new MessageService(new MessageRepository(context.readManager), dispatchDelayQueue),
            ),
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
