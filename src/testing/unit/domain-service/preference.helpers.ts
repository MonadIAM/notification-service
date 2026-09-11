import { PreferenceService } from "~context/domain/services/preference.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class PreferenceUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Preference.Contract {
    public service(props: Unit.Domain.Preference.Service.Props = {}): Unit.Domain.Preference.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new PreferenceService(
                this.contract<Repositories.Preference.Contract>(repositories.preferences),
                this.contract<Repositories.Recipient.Contract>(repositories.recipients),
            ),
            repositories,
            transaction,
        };
    }
}
