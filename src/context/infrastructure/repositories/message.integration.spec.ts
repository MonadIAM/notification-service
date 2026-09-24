import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { ChannelType, FailureReason, MessageStatus } from "~context/enums";

import { MessageRepository } from "./message.repository";

describe("MessageRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new MessageRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("maps the persisted message through the schema", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const notification = await suite.fixtures().createNotification({ recipient });
        const channel = await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });
        const message = await suite.fixtures().createMessage({
            error: "Provider rejected the message",
            failureReason: FailureReason.PROVIDER,
            address: "mapping@example.test",
            channelType: ChannelType.EMAIL,
            status: MessageStatus.FAILED,
            notification,
            channel,
        });

        const loaded = await suite.repository().findUniqueOrThrow({ where: { id: message.id } });

        expect(loaded).toMatchObject({
            error: "Provider rejected the message",
            failureReason: FailureReason.PROVIDER,
            address: "mapping@example.test",
            channelType: ChannelType.EMAIL,
            status: MessageStatus.FAILED,
            createdAt: message.createdAt,
            failedAt: message.failedAt,
            version: message.version,
            sentAt: message.sentAt,
            id: message.id,
            retryCount: 0,
        });
        expect(loaded.notification.id).toBe(notification.id);
        expect(loaded.channel?.id).toBe(channel.id);
    });

    it("finds messages by notification, channel type and status mapper filters", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const notification = await suite.fixtures().createNotification({
            recipient,
        });
        const channel = await suite.fixtures().createChannel({
            type: ChannelType.EMAIL,
            recipient,
        });
        const matched = await suite.fixtures().createMessage({
            channelType: ChannelType.EMAIL,
            status: MessageStatus.SENT,
            notification,
            channel,
        });
        await suite.fixtures().createMessage({
            channelType: ChannelType.EMAIL,
            notification,
            channel,
        });

        const [messages, total] = await suite.repository().findMany({
            pagination: { currentPage: 1, elementsPerPage: 10 },
            sort: { createdAt: QueryOrder.ASC },
            filters: {
                notification: {
                    operator: PublicLinkOperator.EQUAL,
                    value: notification.id,
                },
                channelType: {
                    operator: PublicStringOperator.EQUAL,
                    value: ChannelType.EMAIL,
                },
                status: {
                    operator: PublicStringOperator.EQUAL,
                    value: MessageStatus.SENT,
                },
            },
        });

        expect(total).toBe(1);
        expect(messages.map(({ id }) => id)).toEqual([matched.id]);
    });
});
