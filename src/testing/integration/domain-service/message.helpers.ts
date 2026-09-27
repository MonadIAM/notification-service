import { MessageRepository } from "~context/infrastructure/repositories/message.repository";
import { MessageService } from "~context/domain/services/message.service";

export class MessageIntegrationHelpers implements Integration.Domain.Message.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Message.Service.Context {
        const repositories = this.repositories(context);
        const dispatchDelayQueue: Queues.DispatchDelay.Contract = {
            schedule: () => Promise.reject(new Error("Dispatch queue is not available in PostgreSQL tests")),
            cancel: () => Promise.reject(new Error("Dispatch queue is not available in PostgreSQL tests")),
        };

        return {
            messageService: new MessageService(repositories.messages, dispatchDelayQueue),
            repositories,
        };
    }

    public repositories(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.Message.Repositories.Context {
        return {
            messages: new MessageRepository(context.readManager),
        };
    }
}
