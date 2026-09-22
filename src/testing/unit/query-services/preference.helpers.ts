import { jest } from "@jest/globals";

import { PreferenceQueries } from "~context/application/queries/preference.queries";

import { DomainServiceCoreUnitHelpers } from "../core.helpers";

export class PreferenceQueriesUnitHelpers extends DomainServiceCoreUnitHelpers implements Unit.Queries.Preference.Contract {
    public queries(): Unit.Queries.Preference.Queries.Result {
        const preferenceRepository = {
            findMany: jest.fn<Repositories.Preference.QueryContract["findMany"]>(),
        };

        return {
            preferenceRepository,
            queries: new PreferenceQueries(this.contract<Repositories.Preference.QueryContract>(preferenceRepository)),
        };
    }
}
