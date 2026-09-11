import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { MessageUnitHelpers } from "~testing/unit/domain-service/message.helpers";
import { FailureReason } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-200000000001";
const OTHER_ACCOUNT_ID = "00000000-0000-4000-8000-200000000002";
const MESSAGE_ID = "00000000-0000-4000-8000-200000000003";
const SECOND_MESSAGE_ID = "00000000-0000-4000-8000-200000000004";

const helpers = new MessageUnitHelpers();

function createOwnedMessage(): Entities.Message {
    const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
    const notification = helpers.createNotification({ recipient });

    return helpers.createMessage({ id: MESSAGE_ID, notification });
}

describe("MessageService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("markSent", () => {
        it("finds the message and marks it sent", async () => {
            const message = helpers.createMessage({ id: MESSAGE_ID });
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markSent");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            await service.markSent({
                transaction: transaction.entityManager,
                input: { message: MESSAGE_ID },
            });

            expect(repositories.messages.findUniqueOrThrow).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { id: MESSAGE_ID },
            });
            expect(markSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("markDelivered", () => {
        it("finds the message and marks it delivered", async () => {
            const message = helpers.createMessage({ id: MESSAGE_ID });
            message.markSent();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markDelivered");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            await service.markDelivered({
                transaction: transaction.entityManager,
                input: { message: MESSAGE_ID },
            });

            expect(markSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("markFailed", () => {
        it("passes the failure reason and error through to the entity", async () => {
            const message = helpers.createMessage({ id: MESSAGE_ID });
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markFailed");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            await service.markFailed({
                transaction: transaction.entityManager,
                input: {
                    error: "provider rejected the request",
                    reason: FailureReason.PROVIDER,
                    message: MESSAGE_ID,
                },
            });

            expect(markSpy).toHaveBeenCalledWith({
                error: "provider rejected the request",
                reason: FailureReason.PROVIDER,
            });
        });
    });

    describe("markRead", () => {
        it("marks the message read for the owning account", async () => {
            const message = createOwnedMessage();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markRead");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            await service.markRead({
                input: { message: MESSAGE_ID, actor: ACCOUNT_ID },
                transaction: transaction.entityManager,
            });

            expect(repositories.messages.findUniqueOrThrow).toHaveBeenCalledWith({
                options: { populate: ["notification", "notification.recipient"] },
                transaction: transaction.entityManager,
                where: { id: MESSAGE_ID },
            });
            expect(markSpy).toHaveBeenCalledTimes(1);
        });

        it("hides the message behind a not-found error for any other actor", async () => {
            const message = createOwnedMessage();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markRead");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            await expect(
                service.markRead({
                    input: { message: MESSAGE_ID, actor: OTHER_ACCOUNT_ID },
                    transaction: transaction.entityManager,
                }),
            ).rejects.toThrow("services.message.NOT_FOUND");

            expect(markSpy).not.toHaveBeenCalled();
        });
    });

    describe("markCancelled", () => {
        it("merges and cancels each given message", () => {
            const first = helpers.createMessage({ id: MESSAGE_ID });
            const second = helpers.createMessage({ id: SECOND_MESSAGE_ID });
            const { service, transaction } = helpers.service();
            const firstSpy = jest.spyOn(first, "markCancelled");
            const secondSpy = jest.spyOn(second, "markCancelled");

            service.markCancelled({
                transaction: transaction.entityManager,
                input: { messages: [first, second] },
            });

            expect(transaction.merge).toHaveBeenNthCalledWith(1, first);
            expect(transaction.merge).toHaveBeenNthCalledWith(2, second);
            expect(firstSpy).toHaveBeenCalledTimes(1);
            expect(secondSpy).toHaveBeenCalledTimes(1);
        });
    });
});
