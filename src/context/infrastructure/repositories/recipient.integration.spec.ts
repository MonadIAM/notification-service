import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { PublicLinkOperator } from "~infrastructure/database/enums";

import { RecipientRepository } from "./recipient.repository";

describe("RecipientRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new RecipientRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("findUniqueOrThrow", () => {
        it("maps the persisted recipient through the schema", async () => {
            const account = randomUUID();
            const recipient = await suite.fixtures().createRecipient({
                updatedAt: new Date("2026-03-01T00:00:00.000Z"),
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                timezone: "Europe/Moscow",
                locale: "ru-RU",
                account,
            });

            await expect(suite.repository().findUniqueOrThrow({ where: { id: recipient.id } })).resolves.toMatchObject({
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

    describe("findMany", () => {
        it("finds recipients by account mapper filter", async () => {
            const matched = await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000101",
            });
            await suite.fixtures().createRecipient({
                account: "00000000-0000-0000-0000-000000000102",
            });

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

            expect(total).toBe(1);
            expect(recipients.map(({ id }) => id)).toEqual([matched.id]);
        });
    });
});
