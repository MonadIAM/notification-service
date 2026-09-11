import { ChangeLogService } from "~context/domain/services/change-log.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class ChangeLogUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.ChangeLog.Contract {
    public service(props: Unit.Domain.ChangeLog.Service.Props = {}): Unit.Domain.ChangeLog.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new ChangeLogService(this.contract<Repositories.ChangeLog.Contract>(repositories.changeLogs)),
            repositories,
            transaction,
        };
    }
}
