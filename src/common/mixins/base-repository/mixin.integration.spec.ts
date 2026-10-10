import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { PublicLinkOperator } from "~infrastructure/database/enums";
import { RecipientMapper } from "~context/infrastructure/mappers";
import { Recipient } from "~context/domain/entities";

import { BaseRepository } from "./mixin";

class TestRepository extends BaseRepository<Entities.Recipient, Repositories.Mappers.Recipient.Types>({
    Mapper: RecipientMapper,
    Entity: Recipient,
}) {
    public constructor(protected readonly readManager: ORM.EntityManager) {
        super();
    }
}

describe("[Mixin] - BaseRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new TestRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUnique", () => {
        it("[case] - finds one entity or null by ORM where query", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000001",
            });

            // Act
            const result = await suite.repository().findUnique({ where: { id: recipient.id } });
            const result1 = await suite.repository().findUnique({
                where: { id: "00000000-0000-0000-0000-000000000000" },
            });

            // Assert
            expect(result).toMatchObject({
                id: recipient.id,
                account: recipient.account,
            });
            expect(result1).toBeNull();
        });
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - finds one required entity by ORM where query", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();

            // Act
            const result = await suite.repository().findUniqueOrThrow({ where: { id: recipient.id } });

            // Assert
            expect(result).toMatchObject({
                id: recipient.id,
                locale: recipient.locale,
            });
        });
    });

    describe("[Method] - find", () => {
        it("[case] - finds all entities matching an ORM where query", async () => {
            // Arrange
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "de-DE" });

            // Act
            const recipients = await suite.repository().find({
                where: { locale: "en-US" },
            });
            const result = recipients;
            const result1 = recipients.every(({ locale }) => locale === "en-US");

            // Assert
            expect(result).toHaveLength(2);
            expect(result1).toBe(true);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds and counts entities using explicit ORM where and options", async () => {
            // Arrange
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "en-US" });

            // Act
            const [recipients, total] = await suite.repository().findMany({
                where: { locale: "en-US" },
                options: { orderBy: { createdAt: QueryOrder.ASC } },
            });
            const result = total;

            // Assert
            expect(result).toBe(2);
            expect(recipients).toHaveLength(2);
        });

        it("[case] - finds and counts entities using mapper filters, sort and pagination", async () => {
            // Arrange
            const account = "00000000-0000-0000-0000-000000000002";
            await suite.fixtures().createRecipient({ account });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000003",
            });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000004",
            });

            // Act
            const [recipients, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    account: { operator: PublicLinkOperator.EQUAL, value: account },
                },
            });
            const result = total;

            // Assert
            expect(result).toBe(1);
            expect(recipients[0]?.account).toBe(account);
        });

        it("[case] - finds and counts entities using mapper filters combined with prefilter", async () => {
            // Arrange
            const account = "00000000-0000-0000-0000-000000000005";
            await suite.fixtures().createRecipient({ account, locale: "en-US" });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000006",
                locale: "de-DE",
            });
            await suite.fixtures().createRecipient({ locale: "en-US" });

            // Act
            const [recipients, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                prefilter: { locale: "en-US" },
                filters: {
                    account: { operator: PublicLinkOperator.EQUAL, value: account },
                },
            });
            const result = total;
            const result1 = recipients[0]?.account;

            // Assert
            expect(result).toBe(1);
            expect(result1).toBe(account);
            expect(recipients[0]?.locale).toBe("en-US");
        });

        it("[case] - keeps mapper pagination stable when creation timestamps are equal", async () => {
            // Arrange
            const createdAt = new Date("2026-01-01T00:00:00.000Z");
            const first = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const second = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const third = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const expectedIDs = [first, second, third]
                .sort((left, right) => left.id.localeCompare(right.id))
                .map(({ id }) => id);

            // Act
            const [firstPage, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.ASC },
                prefilter: { locale: "sv-SE" },
                filters: {},
            });
            const [secondPage] = await suite.repository().findMany({
                pagination: { currentPage: 2, elementsPerPage: 2 },
                sort: { createdAt: QueryOrder.ASC },
                prefilter: { locale: "sv-SE" },
                filters: {},
            });
            const result = total;
            const result1 = [...firstPage, ...secondPage].map(({ id }) => id);

            // Assert
            expect(result).toBe(expectedIDs.length);
            expect(result1).toEqual(expectedIDs);
        });
    });
});
