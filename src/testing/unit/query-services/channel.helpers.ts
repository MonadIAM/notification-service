import { jest } from "@jest/globals";

import { ChannelQueries } from "~context/application/queries/channel.queries";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class ChannelQueriesUnitHelpers
    extends DomainServiceCoreUnitHelpers
    implements Unit.Application.ChannelQueries.Contract
{
    public queries(): Unit.Application.ChannelQueries.Queries.Result {
        const channelRepository = {
            findUniqueOrThrow: jest.fn<Repositories.Channel.QueryContract["findUniqueOrThrow"]>(),
            findMany: jest.fn<Repositories.Channel.QueryContract["findMany"]>(),
        };

        return {
            channelRepository,
            queries: new ChannelQueries(this.contract<Repositories.Channel.QueryContract>(channelRepository)),
        };
    }
}
