import { NotificationService } from "~context/domain/services/notification.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class NotificationUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Notification.Contract {
    public service(props: Unit.Domain.Notification.Service.Props = {}): Unit.Domain.Notification.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new NotificationService(this.contract<Repositories.Recipient.Contract>(repositories.recipients)),
            repositories,
            transaction,
        };
    }
}
