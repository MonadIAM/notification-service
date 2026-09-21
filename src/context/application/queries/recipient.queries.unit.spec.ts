import { describe, expect, it } from "@jest/globals";

import { RecipientQueriesUnitHelpers } from "~testing/unit/query-services/recipient.helpers";
import { QueryMode } from "~context/enums";

const helpers = new RecipientQueriesUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";

describe("RecipientQueries", () => {
    it.each([
        { mode: QueryMode.DEFAULT, account: ACTOR },
        { mode: QueryMode.MANAGE, account: ACCOUNT },
    ])("%s selects the correct recipient", async ({ mode, account }) => {
        const { queries, recipientRepository } = helpers.queries();
        const recipient = helpers.createRecipient();
        recipientRepository.findUniqueOrThrow.mockResolvedValue(recipient);

        const result = await queries.findUnique({ mode, actor: ACTOR, account: ACCOUNT });

        expect(result).toBe(recipient);
        expect(recipientRepository.findUniqueOrThrow.mock.calls).toEqual([
            [expect.objectContaining({ where: { account } })],
        ]);
    });
});
