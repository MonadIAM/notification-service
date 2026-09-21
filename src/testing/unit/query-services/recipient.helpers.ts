import { jest } from "@jest/globals";

import { RecipientQueries } from "~context/application/queries/recipient.queries";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class RecipientQueriesUnitHelpers
    extends DomainServiceCoreUnitHelpers
    implements Unit.Application.RecipientQueries.Contract
{
    public queries(): Unit.Application.RecipientQueries.Queries.Result {
        const recipientRepository = {
            findUniqueOrThrow: jest.fn<Repositories.Recipient.QueryContract["findUniqueOrThrow"]>(),
        };

        return {
            recipientRepository,
            queries: new RecipientQueries(this.contract<Repositories.Recipient.QueryContract>(recipientRepository)),
        };
    }
}
