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

describe("[DomainService] - Message", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - markSent", () => {
        it("[case] - finds the message and marks it sent", async () => {
            // Arrange
            const message = helpers.createMessage({ id: MESSAGE_ID });
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markSent");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            // Act
            await service.markSent({
                transaction: transaction.entityManager,
                input: { message: MESSAGE_ID },
            });
            const result = repositories.messages.findUniqueOrThrow;

            // Assert
            expect(result).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { id: MESSAGE_ID },
            });
            expect(markSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("[Method] - markDelivered", () => {
        it("[case] - finds the message and marks it delivered", async () => {
            // Arrange
            const message = helpers.createMessage({ id: MESSAGE_ID });
            message.markSent();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markDelivered");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            // Act
            await service.markDelivered({
                transaction: transaction.entityManager,
                input: { message: MESSAGE_ID },
            });

            // Assert
            expect(markSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("[Method] - markFailed", () => {
        it("[case] - passes the failure reason and error through to the entity", async () => {
            // Arrange
            const message = helpers.createMessage({ id: MESSAGE_ID });
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markFailed");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            // Act
            await service.markFailed({
                transaction: transaction.entityManager,
                input: {
                    error: "provider rejected the request",
                    reason: FailureReason.PROVIDER,
                    message: MESSAGE_ID,
                },
            });

            // Assert
            expect(markSpy).toHaveBeenCalledWith({
                error: "provider rejected the request",
                reason: FailureReason.PROVIDER,
            });
        });
    });

    describe("[Method] - markRead", () => {
        it("[case] - marks the message read for the owning account", async () => {
            // Arrange
            const message = createOwnedMessage();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markRead");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            // Act
            await service.markRead({
                input: { message: MESSAGE_ID, actor: ACCOUNT_ID },
                transaction: transaction.entityManager,
            });
            const result = repositories.messages.findUniqueOrThrow;

            // Assert
            expect(result).toHaveBeenCalledWith({
                options: { populate: ["notification", "notification.recipient"] },
                transaction: transaction.entityManager,
                where: { id: MESSAGE_ID },
            });
            expect(markSpy).toHaveBeenCalledTimes(1);
        });

        it("[case] - hides the message behind a not-found error for any other actor", async () => {
            // Arrange
            const message = createOwnedMessage();
            const { service, repositories, transaction } = helpers.service();
            const markSpy = jest.spyOn(message, "markRead");
            repositories.messages.findUniqueOrThrow.mockImplementation(() => Promise.resolve(message));

            // Act
            const result = service.markRead({
                input: { message: MESSAGE_ID, actor: OTHER_ACCOUNT_ID },
                transaction: transaction.entityManager,
            });
            await Promise.allSettled([result]);

            // Assert
            await expect(result).rejects.toThrow("services.message.NOT_FOUND");
            expect(markSpy).not.toHaveBeenCalled();
        });
    });

    describe("[Method] - markCancelled", () => {
        it("[case] - merges and cancels each given message", () => {
            // Arrange
            const first = helpers.createMessage({ id: MESSAGE_ID });
            const second = helpers.createMessage({ id: SECOND_MESSAGE_ID });
            const { service, transaction } = helpers.service();
            const firstSpy = jest.spyOn(first, "markCancelled");
            const secondSpy = jest.spyOn(second, "markCancelled");

            // Act
            service.markCancelled({
                transaction: transaction.entityManager,
                input: { messages: [first, second] },
            });
            const result = transaction.merge;
            const result1 = transaction.merge;
            const result2 = firstSpy;

            // Assert
            expect(result).toHaveBeenNthCalledWith(1, first);
            expect(result1).toHaveBeenNthCalledWith(2, second);
            expect(result2).toHaveBeenCalledTimes(1);
            expect(secondSpy).toHaveBeenCalledTimes(1);
        });
    });
});
