import { jest } from "@jest/globals";

import { MessageQueries } from "~context/application/queries/message.queries";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class MessageQueriesUnitHelpers
    extends DomainServiceCoreUnitHelpers
    implements Unit.Application.MessageQueries.Contract
{
    public queries(): Unit.Application.MessageQueries.Queries.Result {
        const messageRepository = {
            findUniqueOrThrow: jest.fn<Repositories.Message.QueryContract["findUniqueOrThrow"]>(),
            findMany: jest.fn<Repositories.Message.QueryContract["findMany"]>(),
        };

        return {
            messageRepository,
            queries: new MessageQueries(this.contract<Repositories.Message.QueryContract>(messageRepository)),
        };
    }
}
