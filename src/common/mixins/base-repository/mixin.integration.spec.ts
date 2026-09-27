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

describe("BaseRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new TestRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("findUnique", () => {
        it("finds one entity or null by ORM where query", async () => {
            const recipient = await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000001",
            });

            await expect(suite.repository().findUnique({ where: { id: recipient.id } })).resolves.toMatchObject({
                id: recipient.id,
                account: recipient.account,
            });
            await expect(
                suite.repository().findUnique({
                    where: { id: "00000000-0000-0000-0000-000000000000" },
                }),
            ).resolves.toBeNull();
        });
    });

    describe("findUniqueOrThrow", () => {
        it("finds one required entity by ORM where query", async () => {
            const recipient = await suite.fixtures().createRecipient();

            await expect(suite.repository().findUniqueOrThrow({ where: { id: recipient.id } })).resolves.toMatchObject({
                id: recipient.id,
                locale: recipient.locale,
            });
        });
    });

    describe("find", () => {
        it("finds all entities matching an ORM where query", async () => {
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "de-DE" });

            const recipients = await suite.repository().find({
                where: { locale: "en-US" },
            });

            expect(recipients).toHaveLength(2);
            expect(recipients.every(({ locale }) => locale === "en-US")).toBe(true);
        });
    });

    describe("findMany", () => {
        it("finds and counts entities using explicit ORM where and options", async () => {
            await suite.fixtures().createRecipient({ locale: "en-US" });
            await suite.fixtures().createRecipient({ locale: "en-US" });

            const [recipients, total] = await suite.repository().findMany({
                where: { locale: "en-US" },
                options: { orderBy: { createdAt: QueryOrder.ASC } },
            });

            expect(total).toBe(2);
            expect(recipients).toHaveLength(2);
        });

        it("finds and counts entities using mapper filters, sort and pagination", async () => {
            const account = "00000000-0000-0000-0000-000000000002";
            await suite.fixtures().createRecipient({ account });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000003",
            });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000004",
            });

            const [recipients, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    account: { operator: PublicLinkOperator.EQUAL, value: account },
                },
            });

            expect(total).toBe(1);
            expect(recipients[0]?.account).toBe(account);
        });

        it("finds and counts entities using mapper filters combined with prefilter", async () => {
            const account = "00000000-0000-0000-0000-000000000005";
            await suite.fixtures().createRecipient({ account, locale: "en-US" });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000006",
                locale: "de-DE",
            });
            await suite.fixtures().createRecipient({ locale: "en-US" });

            const [recipients, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                prefilter: { locale: "en-US" },
                filters: {
                    account: { operator: PublicLinkOperator.EQUAL, value: account },
                },
            });

            expect(total).toBe(1);
            expect(recipients[0]?.account).toBe(account);
            expect(recipients[0]?.locale).toBe("en-US");
        });

        it("keeps mapper pagination stable when creation timestamps are equal", async () => {
            const createdAt = new Date("2026-01-01T00:00:00.000Z");
            const first = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const second = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const third = await suite.fixtures().createRecipient({ locale: "sv-SE", createdAt });
            const expectedIDs = [first, second, third]
                .sort((left, right) => left.id.localeCompare(right.id))
                .map(({ id }) => id);

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

            expect(total).toBe(expectedIDs.length);
            expect([...firstPage, ...secondPage].map(({ id }) => id)).toEqual(expectedIDs);
        });
    });
});
