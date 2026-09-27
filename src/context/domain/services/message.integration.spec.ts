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

describe("MessageService integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("markSent / markDelivered", () => {
        it("persists the sent and delivered state transitions", async () => {
            const message = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });

            await suite.transaction((transaction) =>
                suite.repository().messageService.markSent({
                    input: { message: message.id },
                    transaction,
                }),
            );

            await expect(loadMessage(suite, message.id)).resolves.toEqual(
                expect.objectContaining({
                    status: MessageStatus.SENT,
                    sentAt: expect.any(Date),
                    deliveredAt: null,
                }),
            );

            await suite.transaction((transaction) =>
                suite.repository().messageService.markDelivered({
                    input: { message: message.id },
                    transaction,
                }),
            );

            await expect(loadMessage(suite, message.id)).resolves.toEqual(
                expect.objectContaining({
                    status: MessageStatus.DELIVERED,
                    deliveredAt: expect.any(Date),
                    sentAt: expect.any(Date),
                }),
            );
        });
    });

    describe("markFailed", () => {
        it("persists the failure reason and provider error", async () => {
            const message = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });

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

            await expect(loadMessage(suite, message.id)).resolves.toEqual(
                expect.objectContaining({
                    error: "provider rejected the message",
                    failureReason: FailureReason.PROVIDER,
                    status: MessageStatus.FAILED,
                    failedAt: expect.any(Date),
                }),
            );
        });
    });

    describe("markRead", () => {
        it("marks an in-app message read for its owning account", async () => {
            const account = randomUUID();
            const message = await createMessage(suite, {
                channelType: ChannelType.IN_APP,
                account,
            });

            await suite.transaction((transaction) =>
                suite.repository().messageService.markRead({
                    input: { message: message.id, actor: account },
                    transaction,
                }),
            );

            await expect(loadMessage(suite, message.id)).resolves.toEqual(
                expect.objectContaining({ readAt: expect.any(Date) }),
            );
        });

        it("hides another account's message and leaves it unread", async () => {
            const message = await createMessage(suite, {
                channelType: ChannelType.IN_APP,
            });

            await expect(
                suite.transaction((transaction) =>
                    suite.repository().messageService.markRead({
                        input: { message: message.id, actor: randomUUID() },
                        transaction,
                    }),
                ),
            ).rejects.toThrow("services.message.NOT_FOUND");

            await expect(loadMessage(suite, message.id)).resolves.toEqual(expect.objectContaining({ readAt: null }));
        });
    });

    describe("markCancelled", () => {
        it("merges detached messages and persists their cancellation", async () => {
            const first = await createMessage(suite, {
                channelType: ChannelType.EMAIL,
            });
            const secondRecipient = await suite.fixtures().createRecipient();
            const secondNotification = await suite.fixtures().createNotification({ recipient: secondRecipient });
            const second = await suite.fixtures().createMessage({
                notification: secondNotification,
                channelType: ChannelType.SMS,
            });

            await suite.transaction(async (transaction) => {
                await Promise.resolve(
                    suite.repository().messageService.markCancelled({
                        input: { messages: [first, second] },
                        transaction,
                    }),
                );
            });

            await expect(loadMessage(suite, first.id)).resolves.toEqual(
                expect.objectContaining({
                    status: MessageStatus.CANCELLED,
                    cancelledAt: expect.any(Date),
                }),
            );
            await expect(loadMessage(suite, second.id)).resolves.toEqual(
                expect.objectContaining({
                    status: MessageStatus.CANCELLED,
                    cancelledAt: expect.any(Date),
                }),
            );
        });
    });
});
