import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { postgresSuite } from "~testing/integration/postgres.suite";
import { ChannelType, NotificationCategory } from "~context/enums";

import { PreferenceRepository } from "./preference.repository";

describe("PreferenceRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new PreferenceRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("maps the persisted preference through the schema", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const preference = await suite.fixtures().createPreference({
            category: NotificationCategory.SECURITY,
            channelType: ChannelType.SMS,
            isDuplicationEnabled: true,
            recipient,
        });

        const loaded = await suite.repository().findUniqueOrThrow({ where: { id: preference.id } });

        expect(loaded).toMatchObject({
            category: NotificationCategory.SECURITY,
            createdAt: preference.createdAt,
            channelType: ChannelType.SMS,
            version: preference.version,
            isDuplicationEnabled: true,
            id: preference.id,
        });
        expect(loaded.recipient.id).toBe(recipient.id);
    });

    it("finds preferences by recipient, channel and category mapper filters", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const matched = await suite.fixtures().createPreference({
            recipient,
            category: NotificationCategory.SECURITY,
            channelType: ChannelType.EMAIL,
        });
        await suite.fixtures().createPreference({
            recipient,
            category: NotificationCategory.SYSTEM,
            channelType: ChannelType.EMAIL,
        });

        const [preferences, total] = await suite.repository().findMany({
            filters: {
                recipient: {
                    operator: PublicLinkOperator.EQUAL,
                    value: recipient.id,
                },
                channelType: {
                    operator: PublicStringOperator.EQUAL,
                    value: ChannelType.EMAIL,
                },
                category: {
                    operator: PublicStringOperator.EQUAL,
                    value: NotificationCategory.SECURITY,
                },
            },
            sort: { createdAt: QueryOrder.ASC },
            pagination: { currentPage: 1, elementsPerPage: 10 },
        });

        expect(total).toBe(1);
        expect(preferences.map(({ id }) => id)).toEqual([matched.id]);
    });
});
