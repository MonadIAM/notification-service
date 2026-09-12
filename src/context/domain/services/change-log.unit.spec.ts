import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ChangeLogUnitHelpers } from "~testing/unit/domain-service/change-log.helpers";

const EXPIRATION_DATE = new Date("2026-01-01T00:00:00.000Z");

const helpers = new ChangeLogUnitHelpers();

describe("ChangeLogService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("purgeExpired", () => {
        it("finds entries older than the expiration date within the batch and removes them", async () => {
            const first = helpers.createChangeLog();
            const second = helpers.createChangeLog({ entityType: "MESSAGE" });
            const { service, repositories, transaction } = helpers.service();
            repositories.changeLogs.find.mockImplementation(() => Promise.resolve([first, second]));

            const result = await service.purgeExpired({
                transaction: transaction.entityManager,
                expirationDate: EXPIRATION_DATE,
                batchSize: 50,
            });

            expect(repositories.changeLogs.find).toHaveBeenCalledWith({
                where: { createdAt: { $lt: EXPIRATION_DATE } },
                transaction: transaction.entityManager,
                options: { limit: 50 },
            });
            expect(transaction.remove).toHaveBeenNthCalledWith(1, first);
            expect(transaction.remove).toHaveBeenNthCalledWith(2, second);
            expect(result).toEqual([first, second]);
        });
    });
});
