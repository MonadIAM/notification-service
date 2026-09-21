import { describe, expect, it } from "@jest/globals";

import { PreferenceQueriesUnitHelpers } from "~testing/unit/query-services/preference.helpers";
import { QueryMode } from "~context/enums";

const PAGINATION: Pagination = { currentPage: 2, elementsPerPage: 10 };
const helpers = new PreferenceQueriesUnitHelpers();
const ACTOR = "actor-account";

describe("PreferenceQueries", () => {
    it.each([
        { mode: QueryMode.DEFAULT, prefilter: { recipient: { account: ACTOR } } },
        { mode: QueryMode.MANAGE, prefilter: {} },
    ])("%s isolates preferences by recipient", async ({ mode, prefilter }) => {
        const { queries, preferenceRepository } = helpers.queries();
        preferenceRepository.findMany.mockResolvedValue([[], 0]);

        await queries.findMany({ mode, actor: ACTOR, pagination: PAGINATION, filters: {}, sort: {} });

        expect(preferenceRepository.findMany.mock.calls).toEqual([[expect.objectContaining({ prefilter })]]);
    });
});
