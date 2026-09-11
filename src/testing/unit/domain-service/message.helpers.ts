import { MessageService } from "~context/domain/services/message.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class MessageUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Message.Contract {
    public service(props: Unit.Domain.Message.Service.Props = {}): Unit.Domain.Message.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new MessageService(this.contract<Repositories.Message.Contract>(repositories.messages)),
            repositories,
            transaction,
        };
    }
}
