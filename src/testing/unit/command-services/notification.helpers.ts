import { jest } from "@jest/globals";

import { NotificationCommands } from "~context/application/commands/notification.commands";

import { ApplicationCommandUnitHelpers } from "./core.helpers";

export class NotificationCommandsUnitHelpers
    extends ApplicationCommandUnitHelpers
    implements Unit.Commands.Notification.Contract
{
    public commands(): Unit.Commands.Notification.Commands.Result {
        const execution = this.execution();

        const notificationService = {
            create: jest.fn<Services.Notification.CommandContract["create"]>(),
            register: jest.fn<Services.Notification.CommandContract["register"]>(),
            cancel: jest.fn<Services.Notification.CommandContract["cancel"]>(),
        };

        return {
            ...execution,
            notificationService,
            commands: new NotificationCommands(
                execution.transactional,
                this.contract<Services.Notification.CommandContract>(notificationService),
            ),
        };
    }
}
