import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { MessageIntegrationHelpers } from "~testing/integration/domain-service/message.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { FailureReason, MessageStatus, ChannelType } from "~context/enums";
import { Message } from "~context/domain/entities";

const helpers = new MessageIntegrationHelpers();

async function loadMessage(suite: Integration.Domain.Message.Suite, id: string): Promise<Entities.Message> {
    return await suite.transaction((transaction) =>
        transaction.findOneOrFail(Message, { id }, { populate: ["notification", "notification.recipient"] }),
    );
}

async function createMessage(
    suite: Integration.Domain.Message.Suite,
    props: {
        account?: string;
        channelType?: ChannelType;
        status?: MessageStatus;
    } = {},
): Promise<Entities.Message> {
    const recipient = await suite.fixtures().createRecipient({ account: props.account });
    const notification = await suite.fixtures().createNotification({ recipient });

    return await suite.fixtures().createMessage({
        channelType: props.channelType ?? ChannelType.IN_APP,
        status: props.status,
        notification,
    });
}

describe("[DomainService] - Message", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Behavior] - delivery status", () => {
        it("[case] - persists the sent and delivered state transitions", async () => {
            // Arrange
            const message = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().messageService.markSent({
                    input: { message: message.id },
                    transaction,
                }),
            );
            const sent = await loadMessage(suite, message.id);
            await suite.transaction((transaction) =>
                suite.repository().messageService.markDelivered({
                    input: { message: message.id },
                    transaction,
                }),
            );
            const delivered = await loadMessage(suite, message.id);

            // Assert
            expect(sent).toEqual(
                expect.objectContaining({
                    status: MessageStatus.SENT,
                    sentAt: expect.any(Date),
                    deliveredAt: null,
                }),
            );
            expect(delivered).toEqual(
                expect.objectContaining({
                    status: MessageStatus.DELIVERED,
                    deliveredAt: expect.any(Date),
                    sentAt: expect.any(Date),
                }),
            );
        });
    });

    describe("[Method] - markFailed", () => {
        it("[case] - persists the failure reason and provider error", async () => {
            // Arrange
            const message = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().messageService.markFailed({
                    input: {
                        error: "provider rejected the message",
                        reason: FailureReason.PROVIDER,
                        message: message.id,
                    },
                    transaction,
                }),
            );
            const result = await loadMessage(suite, message.id);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    error: "provider rejected the message",
                    failureReason: FailureReason.PROVIDER,
                    status: MessageStatus.FAILED,
                    failedAt: expect.any(Date),
                }),
            );
        });
    });

    describe("[Method] - markRead", () => {
        it("[case] - marks an in-app message read for its owning account", async () => {
            // Arrange
            const account = randomUUID();
            const message = await createMessage(suite, {
                channelType: ChannelType.IN_APP,
                account,
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().messageService.markRead({
                    input: { message: message.id, actor: account },
                    transaction,
                }),
            );
            const result = await loadMessage(suite, message.id);

            // Assert
            expect(result).toEqual(expect.objectContaining({ readAt: expect.any(Date) }));
        });

        it("[case] - hides another account's message and leaves it unread", async () => {
            // Arrange
            const message = await createMessage(suite, {
                channelType: ChannelType.IN_APP,
            });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().messageService.markRead({
                    input: { message: message.id, actor: randomUUID() },
                    transaction,
                }),
            );
            await Promise.allSettled([result]);
            const result1 = await loadMessage(suite, message.id);

            // Assert
            await expect(result).rejects.toThrow("services.message.NOT_FOUND");
            expect(result1).toEqual(expect.objectContaining({ readAt: null }));
        });
    });

    describe("[Method] - markCancelled", () => {
        it("[case] - merges detached messages and persists their cancellation", async () => {
            // Arrange
            const first = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });
            const secondRecipient = await suite.fixtures().createRecipient();
            const secondNotification = await suite.fixtures().createNotification({ recipient: secondRecipient });
            const second = await suite.fixtures().createMessage({
                notification: secondNotification,
                channelType: ChannelType.SMS,
            });

            // Act
            await suite.transaction(async (transaction) => {
                await Promise.resolve(
                    suite.repository().messageService.markCancelled({
                        input: { messages: [first, second] },
                        transaction,
                    }),
                );
            });
            const result = await loadMessage(suite, first.id);
            const result1 = await loadMessage(suite, second.id);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    status: MessageStatus.CANCELLED,
                    cancelledAt: expect.any(Date),
                }),
            );
            expect(result1).toEqual(
                expect.objectContaining({
                    status: MessageStatus.CANCELLED,
                    cancelledAt: expect.any(Date),
                }),
            );
        });
    });
});
