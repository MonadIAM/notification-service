import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { FailureReason, MessageStatus, ChannelType } from "~context/enums";

import { Message } from "./message.entity";

const entities = new EntityFactoryRegistry();

function createMessage(overrides?: Partial<Entities.Message.ConstructorProps>): Message {
    return new Message({
        notification: entities.createNotification(),
        channelType: ChannelType.EMAIL,
        address: "user@example.com",
        ...overrides,
    });
}

describe("[Entity] - Message", () => {
    describe("[Method] - constructor", () => {
        it("[case] - assigns required fields and relations", () => {
            // Arrange
            const notification = entities.createNotification();
            const channel = entities.createChannel({ recipient: notification.recipient });

            // Act
            const message = createMessage({
                address: "+15551234567",
                channelType: ChannelType.SMS,
                notification,
                channel,
            });
            const result = message.address;
            const result1 = message.channelType;
            const result2 = message.notification;

            // Assert
            expect(result).toBe("+15551234567");
            expect(result1).toBe(ChannelType.SMS);
            expect(result2).toBe(notification);
            expect(message.channel).toBe(channel);
        });

        it("[case] - defaults status and retryCount", () => {
            // Arrange

            // Act
            const message = createMessage();
            const result = message.status;

            // Assert
            expect(result).toBe(MessageStatus.QUEUED);
            expect(message.retryCount).toBe(0);
        });

        it("[case] - autos-generate id, createdAt, version", () => {
            // Arrange

            // Act
            const message = createMessage();
            const result = isUUID(message.id, "4");
            const result1 = message.createdAt;
            const result2 = message.version;
            const result3 = message.sentAt;
            const result4 = message.deliveredAt;
            const result5 = message.failedAt;
            const result6 = message.cancelledAt;

            // Assert
            expect(result).toBe(true);
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBe(1);
            expect(result3).toBeUndefined();
            expect(result4).toBeUndefined();
            expect(result5).toBeUndefined();
            expect(result6).toBeUndefined();
            expect(message.readAt).toBeUndefined();
        });
    });

    describe("[Method] - markSent", () => {
        it("[case] - marks a queued message as sent", () => {
            // Arrange
            const message = createMessage();

            // Act
            message.markSent();
            const result = message.status;

            // Assert
            expect(result).toBe(MessageStatus.SENT);
            expect(message.sentAt).toBeInstanceOf(Date);
        });

        it("[case] - throws when message is not queued", () => {
            // Arrange
            const message = createMessage();

            // Act
            message.markSent();
            const act = (): unknown => message.markSent();

            // Assert
            expect(act).toThrow("CANNOT_SEND_FROM_STATE");
        });
    });

    describe("[Method] - markDelivered", () => {
        it("[case] - marks a sent message as delivered", () => {
            // Arrange
            const message = createMessage();
            message.markSent();

            // Act
            message.markDelivered();
            const result = message.status;

            // Assert
            expect(result).toBe(MessageStatus.DELIVERED);
            expect(message.deliveredAt).toBeInstanceOf(Date);
        });

        it("[case] - throws when message is not sent", () => {
            // Arrange
            const message = createMessage();

            // Act
            const act = (): unknown => message.markDelivered();

            // Assert
            expect(act).toThrow("CANNOT_DELIVER_FROM_STATE");
        });
    });

    describe("[Method] - markCancelled", () => {
        it("[case] - marks message as cancelled", () => {
            // Arrange
            const message = createMessage();

            // Act
            message.markCancelled();
            const result = message.status;

            // Assert
            expect(result).toBe(MessageStatus.CANCELLED);
            expect(message.cancelledAt).toBeInstanceOf(Date);
        });
    });

    describe("[Method] - markFailed", () => {
        it.each([
            { reason: FailureReason.PROVIDER, error: "provider timeout" },
            { reason: FailureReason.INTERNAL, error: undefined },
        ])("[case] - records failure $reason with error $error", ({ reason, error }) => {
            // Arrange
            const message = createMessage();

            // Act
            message.markFailed({ reason, error });
            const result = message.status;
            const result1 = message.failedAt;
            const result2 = message.failureReason;

            // Assert
            expect(result).toBe(MessageStatus.FAILED);
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBe(reason);
            expect(message.error).toBe(error);
        });

        it("[case] - throws when delivered message is failed", () => {
            // Arrange
            const message = createMessage();
            message.markSent();
            message.markDelivered();

            // Act
            const act = (): unknown => message.markFailed({ reason: FailureReason.PROVIDER });

            // Assert
            expect(act).toThrow("CANNOT_FAIL_DELIVERED");
        });
    });

    describe("[Method] - markRead", () => {
        it("[case] - marks in-app message as read", () => {
            // Arrange
            const message = createMessage({ channelType: ChannelType.IN_APP, address: "account-id" });

            // Act
            message.markRead();

            // Assert
            expect(message.readAt).toBeInstanceOf(Date);
        });

        it.each([ChannelType.EMAIL, ChannelType.SMS])("[case] - rejects read state for %s", (channelType) => {
            // Arrange
            const message = createMessage({ channelType });

            // Act
            const act = (): unknown => message.markRead();

            // Assert
            expect(act).toThrow("READ_STATE_IN_APP_ONLY");
        });

        it("[case] - throws when message is already read", () => {
            // Arrange
            const message = createMessage({ channelType: ChannelType.IN_APP, address: "account-id" });

            // Act
            message.markRead();
            const act = (): unknown => message.markRead();

            // Assert
            expect(act).toThrow("ALREADY_READ");
        });
    });
});
