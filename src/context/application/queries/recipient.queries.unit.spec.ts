import { describe, expect, it } from "@jest/globals";

import { RecipientQueriesUnitHelpers } from "~testing/unit/query-services/recipient.helpers";
import { QueryMode } from "~context/enums";

const helpers = new RecipientQueriesUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";

describe("[Queries] - Recipient", () => {
    describe("[Method] - findUnique", () => {
        it.each([
            { mode: QueryMode.DEFAULT, account: ACTOR },
            { mode: QueryMode.MANAGE, account: ACCOUNT },
        ])("[case] - $mode selects the correct recipient", async ({ mode, account }) => {
            // Arrange
            const { queries, recipientRepository } = helpers.queries();
            const recipient = helpers.createRecipient();
            recipientRepository.findUniqueOrThrow.mockResolvedValue(recipient);

            // Act
            const result = await queries.findUnique({ mode, actor: ACTOR, account: ACCOUNT });
            const result1 = result;

            // Assert
            expect(result1).toBe(recipient);
            expect(recipientRepository.findUniqueOrThrow.mock.calls).toEqual([
                [expect.objectContaining({ where: { account } })],
            ]);
        });
    });
});
