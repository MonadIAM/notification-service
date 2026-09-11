import { RecipientService } from "~context/domain/services/recipient.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class RecipientUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Recipient.Contract {
    public service(props: Unit.Domain.Recipient.Service.Props = {}): Unit.Domain.Recipient.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new RecipientService(
                this.contract<Repositories.Recipient.Contract>(repositories.recipients),
                this.contract<Repositories.Channel.Contract>(repositories.channels),
            ),
            repositories,
            transaction,
        };
    }
}
