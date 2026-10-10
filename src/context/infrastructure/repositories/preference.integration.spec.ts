import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { ChannelType, NotificationCategory } from "~context/enums";

import { PreferenceRepository } from "./preference.repository";

describe("[Repository] - Preference", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new PreferenceRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - maps the persisted preference through the schema", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const preference = await suite.fixtures().createPreference({
                category: NotificationCategory.SECURITY,
                channelType: ChannelType.SMS,
                isDuplicationEnabled: true,
                recipient,
            });

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: preference.id } });
            const result = loaded;

            // Assert
            expect(result).toMatchObject({
                category: NotificationCategory.SECURITY,
                createdAt: preference.createdAt,
                channelType: ChannelType.SMS,
                version: preference.version,
                isDuplicationEnabled: true,
                id: preference.id,
            });
            expect(loaded.recipient.id).toBe(recipient.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds preferences by recipient, channel and category mapper filters", async () => {
            // Arrange
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

            // Act
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
            const result = total;
            const result1 = preferences.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });
    });
});
