import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { ChannelType, FailureReason, MessageStatus } from "~context/enums";

import { MessageRepository } from "./message.repository";

describe("[Repository] - Message", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new MessageRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - findUniqueOrThrow", () => {
        it("[case] - maps the persisted message through the schema", async () => {
            // Arrange
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

            // Act
            const loaded = await suite.repository().findUniqueOrThrow({ where: { id: message.id } });
            const result = loaded;
            const result1 = loaded.notification.id;

            // Assert
            expect(result).toMatchObject({
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
            expect(result1).toBe(notification.id);
            expect(loaded.channel?.id).toBe(channel.id);
        });
    });

    describe("[Method] - findMany", () => {
        it("[case] - finds messages by notification, channel type and status mapper filters", async () => {
            // Arrange
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

            // Act
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
            const result = total;
            const result1 = messages.map(({ id }) => id);

            // Assert
            expect(result).toBe(1);
            expect(result1).toEqual([matched.id]);
        });
    });
});
