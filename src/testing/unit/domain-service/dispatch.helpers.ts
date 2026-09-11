import { DispatchService } from "~context/domain/services/dispatch.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class DispatchUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Dispatch.Contract {
    public service(): Unit.Domain.Dispatch.Service.Result {
        const transaction = this.transaction();
        const services = this.services();

        return {
            service: new DispatchService(
                this.contract<CommonServices.Email.PublicContract>(services.email),
                this.contract<CommonServices.SMS.PublicContract>(services.sms),
            ),
            transaction,
            services,
        };
    }
}
