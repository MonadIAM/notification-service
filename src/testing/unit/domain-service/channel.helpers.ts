import { ChannelService } from "~context/domain/services/channel.service";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class ChannelUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Domain.Channel.Contract {
    public service(props: Unit.Domain.Channel.Service.Props = {}): Unit.Domain.Channel.Service.Result {
        const repositories = this.repositories(props);
        const transaction = this.transaction();

        return {
            service: new ChannelService(
                this.contract<Repositories.Recipient.Contract>(repositories.recipients),
                this.contract<Repositories.Channel.Contract>(repositories.channels),
            ),
            repositories,
            transaction,
        };
    }
}
