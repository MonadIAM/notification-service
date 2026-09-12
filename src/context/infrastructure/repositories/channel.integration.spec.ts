import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { postgresSuite } from "~testing/integration/postgres.suite";
import { ChannelType } from "~context/enums";

import { ChannelRepository } from "./channel.repository";

describe("ChannelRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new ChannelRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("maps the persisted channel through the schema", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const sourceIdentifier = randomUUID();
        const channel = await suite.fixtures().createChannel({
            address: "in-app:mapping",
            type: ChannelType.IN_APP,
            sourceIdentifier,
            isVerified: true,
            recipient,
        });

        const loaded = await suite.repository().findUniqueOrThrow({ where: { id: channel.id } });

        expect(loaded).toMatchObject({
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

    it("finds channels by recipient and type mapper filters", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const matched = await suite.fixtures().createChannel({
            type: ChannelType.EMAIL,
            recipient,
        });
        await suite.fixtures().createChannel({ recipient, type: ChannelType.SMS });

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

        expect(total).toBe(1);
        expect(channels.map(({ id }) => id)).toEqual([matched.id]);
    });
});
