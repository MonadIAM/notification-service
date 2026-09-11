import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { AuditLogUnitHelpers } from "~testing/unit/domain-service/audit-log.helpers";

const EXPIRATION_DATE = new Date("2026-01-01T00:00:00.000Z");

const helpers = new AuditLogUnitHelpers();

describe("AuditLogService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("purgeExpired", () => {
        it("finds entries older than the expiration date within the batch and removes them", async () => {
            const first = helpers.createAuditLog();
            const second = helpers.createAuditLog({ actionType: "DELETE" });
            const { service, repositories, transaction } = helpers.service();
            repositories.auditLogs.find.mockImplementation(() => Promise.resolve([first, second]));

            const result = await service.purgeExpired({
                transaction: transaction.entityManager,
                expirationDate: EXPIRATION_DATE,
                batchSize: 100,
            });

            expect(repositories.auditLogs.find).toHaveBeenCalledWith({
                where: { createdAt: { $lt: EXPIRATION_DATE } },
                transaction: transaction.entityManager,
                options: { limit: 100 },
            });
            expect(transaction.remove).toHaveBeenNthCalledWith(1, first);
            expect(transaction.remove).toHaveBeenNthCalledWith(2, second);
            expect(result).toEqual([first, second]);
        });
    });
});
