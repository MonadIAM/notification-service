import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { DeltaChanges } from "~common/transaction-manager/value-objects";
import { PublicStringOperator } from "~infrastructure/database/enums";
import { EntityType } from "~context/enums";

import { ChangeLogRepository } from "./change-log.repository";

describe("[Repository] - ChangeLog", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new ChangeLogRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - maps the persisted change log entry through the schema", async () => {
            // Arrange
            const entity = randomUUID();
            const changeLog = await suite.fixtures().createChangeLog({
                delta: new DeltaChanges({ title: { old: "Old Title", new: "New Title" } }),
                changeType: ChangeSetType.UPDATE,
                entityType: EntityType.MESSAGE,
                entity,
            });

            // Act
            const result = await suite.repository().findUniqueOrThrow({ where: { id: changeLog.id } });

            // Assert
            expect(result).toMatchObject({
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

        it("[case] - persists a joined composite entity id in the text column", async () => {
            // Arrange
            const entity = `${randomUUID()}:${randomUUID()}:1`;
            const changeLog = await suite.fixtures().createChangeLog({ entity });

            // Act
            const result = await suite.repository().findUniqueOrThrow({ where: { id: changeLog.id } });

            // Assert
            expect(result).toMatchObject({
                entity,
            });
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds change log entries by change type and entity mapper filters", async () => {
            // Arrange
            const matched = await suite.fixtures().createChangeLog({
                changeType: ChangeSetType.CREATE,
                entityType: EntityType.MESSAGE,
            });
            await suite.fixtures().createChangeLog({
                changeType: ChangeSetType.UPDATE,
                entityType: EntityType.MESSAGE,
            });

            // Act
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
            const result = total;
            const result1 = entries.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });
    });
});
