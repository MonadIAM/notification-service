import { jest } from "@jest/globals";

import { NotificationCommands } from "~context/application/commands/notification.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class NotificationCommandsUnitHelpers
    extends ApplicationCommandUnitHelpers
    implements Unit.Commands.Notification.Contract
{
    public commands(): Unit.Commands.Notification.Commands.Result {
        const execution = this.execution();

        const messageService = {
            markCancelled: jest.fn<Services.Message.CommandContract["markCancelled"]>(),
        };
        const notificationRepository = {
            findUnique: jest.fn<Repositories.Notification.Contract["findUnique"]>(),
        };
        const notificationService = {
            create: jest.fn<Services.Notification.CommandContract["create"]>(),
        };
        const dispatchDelayQueue = {
            cancel: jest.fn<Queues.DispatchDelay.Contract["cancel"]>(),
        };

        return {
            ...execution,
            notificationRepository,
            notificationService,
            dispatchDelayQueue,
            messageService,
            commands: new NotificationCommands(
                execution.transactional,
                this.contract<Repositories.Notification.Contract>(notificationRepository),
                this.contract<Queues.DispatchDelay.Contract>(dispatchDelayQueue),
                this.contract<Services.Notification.CommandContract>(notificationService),
                this.contract<Services.Message.CommandContract>(messageService),
            ),
        };
    }
}
