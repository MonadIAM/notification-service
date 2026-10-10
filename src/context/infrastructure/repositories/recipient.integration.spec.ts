import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { PublicLinkOperator } from "~infrastructure/database/enums";

import { RecipientRepository } from "./recipient.repository";

describe("[Repository] - Recipient", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new RecipientRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - maps the persisted recipient through the schema", async () => {
            // Arrange
            const account = randomUUID();
            const recipient = await suite.fixtures().createRecipient({
                updatedAt: new Date("2026-03-01T00:00:00.000Z"),
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                timezone: "Europe/Moscow",
                locale: "ru-RU",
                account,
            });

            // Act
            const result = await suite.repository().findUniqueOrThrow({ where: { id: recipient.id } });

            // Assert
            expect(result).toMatchObject({
                updatedAt: new Date("2026-03-01T00:00:00.000Z"),
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                version: recipient.version,
                timezone: "Europe/Moscow",
                id: recipient.id,
                locale: "ru-RU",
                account,
            });
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds recipients by account mapper filter", async () => {
            // Arrange
            const matched = await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000101",
            });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000102",
            });

            // Act
            const [recipients, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    account: {
                        operator: PublicLinkOperator.EQUAL,
                        value: matched.account,
                    },
                },
            });
            const result = total;
            const result1 = recipients.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });
    });
});
