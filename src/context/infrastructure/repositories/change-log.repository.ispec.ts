import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { DeltaChanges } from "~common/transaction-manager/value-objects";
import { PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/postgres.suite";
import { CoreFixture } from "~testing/fixtures/core.fixture";
import { EntityType } from "~context/enums";

import { ChangeLogRepository } from "./change-log.repository";

describe("ChangeLogRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new ChangeLogRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("maps the persisted change log entry through the schema", async () => {
        const entity = randomUUID();
        const changeLog = await suite.fixtures().createChangeLog({
            delta: new DeltaChanges({ title: { old: "Old Title", new: "New Title" } }),
            changeType: ChangeSetType.UPDATE,
            entityType: EntityType.MESSAGE,
            entity,
        });

        await expect(suite.repository().findUniqueOrThrow({ where: { id: changeLog.id } })).resolves.toMatchObject({
            delta: new DeltaChanges({ title: { old: "Old Title", new: "New Title" } }),
            auditEntry: changeLog.auditEntry,
            changeType: ChangeSetType.UPDATE,
            keyVersion: changeLog.keyVersion,
            signature: changeLog.signature,
            createdAt: changeLog.createdAt,
            entityType: EntityType.MESSAGE,
            id: changeLog.id,
            entity,
        });
    });

    it("finds change log entries by change type and entity mapper filters", async () => {
        const matched = await suite.fixtures().createChangeLog({
            changeType: ChangeSetType.CREATE,
            entityType: EntityType.MESSAGE,
        });
        await suite.fixtures().createChangeLog({
            changeType: ChangeSetType.UPDATE,
            entityType: EntityType.MESSAGE,
        });

        const [entries, total] = await suite.repository().findMany({
            pagination: { currentPage: 1, elementsPerPage: 10 },
            sort: { createdAt: QueryOrder.ASC },
            filters: {
                changeType: {
                    operator: PublicStringOperator.EQUAL,
                    value: ChangeSetType.CREATE,
                },
                entityType: {
                    operator: PublicStringOperator.EQUAL,
                    value: EntityType.MESSAGE,
                },
            },
        });

        expect(total).toBe(1);
        expect(entries.map(({ id }) => id)).toEqual([matched.id]);
    });
});
