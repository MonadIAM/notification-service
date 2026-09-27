import { jest } from "@jest/globals";

import { MessageService } from "~context/domain/services/message.service";
import { RecipientService } from "~context/domain/services/recipient.service";
import { ChannelService } from "~context/domain/services/channel.service";
import { NotificationService } from "~context/domain/services/notification.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class NotificationUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Notification.Contract {
    public service(props: Unit.Domain.Notification.Service.Props = {}): Unit.Domain.Notification.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();
        const dispatchDelayQueue = { cancel: jest.fn<Queues.DispatchDelay.Contract["cancel"]>() };

        return {
            service: new NotificationService(
                this.contract<Repositories.Recipient.Contract>(repositories.recipients),
                new RecipientService(
                    this.contract<Repositories.Recipient.Contract>(repositories.recipients),
                    this.contract<Repositories.Channel.Contract>(repositories.channels),
                    new ChannelService(
                        this.contract<Repositories.Recipient.Contract>(repositories.recipients),
                        this.contract<Repositories.Channel.Contract>(repositories.channels),
                    ),
                ),
                this.contract<Repositories.Notification.Contract>(repositories.notifications),
                new MessageService(
                    this.contract<Repositories.Message.Contract>(repositories.messages),
                    this.contract<Queues.DispatchDelay.Contract>(dispatchDelayQueue),
                ),
            ),
            dispatchDelayQueue,
            repositories,
            transaction,
        };
    }
}
