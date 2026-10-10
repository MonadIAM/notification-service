import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { ChannelType } from "~context/enums";

import { ChannelRepository } from "./channel.repository";

describe("[Repository] - Channel", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new ChannelRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - maps the persisted channel through the schema", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const sourceIdentifier = randomUUID();
            const channel = await suite.fixtures().createChannel({
                address: "in-app:mapping",
                type: ChannelType.IN_APP,
                sourceIdentifier,
                isVerified: true,
                recipient,
            });

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: channel.id } });
            const result = loaded;

            // Assert
            expect(result).toMatchObject({
                verifiedAt: channel.verifiedAt,
                createdAt: channel.createdAt,
                address: "in-app:mapping",
                type: ChannelType.IN_APP,
                version: channel.version,
                soundEnabled: true,
                sourceIdentifier,
                isVerified: true,
                id: channel.id,
            });
            expect(loaded.recipient.id).toBe(recipient.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds channels by recipient and type mapper filters", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const matched = await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                recipient,
            });
            await suite.fixtures().createChannel({ recipient, type: ChannelType.SMS });

            // Act
            const [channels, total] = await suite.repository().findMany({
                pagination: { currentPage: 1, elementsPerPage: 10 },
                sort: { createdAt: QueryOrder.ASC },
                filters: {
                    recipient: {
                        operator: PublicLinkOperator.EQUAL,
                        value: recipient.id,
                    },
                    type: {
                        operator: PublicStringOperator.EQUAL,
                        value: ChannelType.EMAIL,
                    },
                },
            });
            const result = total;
            const result1 = channels.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });
    });
});
