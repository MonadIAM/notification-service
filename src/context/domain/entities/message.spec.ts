import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";

import { Notification } from "./notification.entity";
import { Channel } from "./channel.entity";
import { Message } from "./message.entity";

function createMessage(overrides?: Partial<Entities.Message.ConstructorProps>): Message {
    return new Message({
        notification: {} as Notification,
        channelType: ChannelType.EMAIL,
        address: "user@example.com",
        ...overrides,
    });
}

describe("Message Entity", () => {
    describe("constructor", () => {
        it("should assign required fields and relations", () => {
            const notification = {} as Notification;
            const channel = {} as Channel;

            const message = createMessage({
                address: "+15551234567",
                channelType: ChannelType.SMS,
                notification,
                channel,
            });

            expect(message.address).toBe("+15551234567");
            expect(message.channelType).toBe(ChannelType.SMS);
            expect(message.notification).toBe(notification);
            expect(message.channel).toBe(channel);
        });

        it("should default status and retryCount", () => {
            const message = createMessage();

            expect(message.status).toBe(MessageStatus.QUEUED);
            expect(message.retryCount).toBe(0);
        });

        it("should auto-generate id, createdAt, version", () => {
            const message = createMessage();

            expect(isUUID(message.id, "4")).toBe(true);
            expect(message.createdAt).toBeInstanceOf(Date);
            expect(message.version).toBe(1);
            expect(message.sentAt).toBeUndefined();
            expect(message.deliveredAt).toBeUndefined();
            expect(message.failedAt).toBeUndefined();
            expect(message.cancelledAt).toBeUndefined();
            expect(message.readAt).toBeUndefined();
        });
    });

    describe("markSent", () => {
        it("should mark a queued message as sent", () => {
            const message = createMessage();

            message.markSent();

            expect(message.status).toBe(MessageStatus.SENT);
            expect(message.sentAt).toBeInstanceOf(Date);
        });

        it("should throw when message is not queued", () => {
            const message = createMessage();
            message.markSent();

            expect(() => message.markSent()).toThrow("CANNOT_SEND_FROM_STATE");
        });
    });

    describe("markDelivered", () => {
        it("should mark a sent message as delivered", () => {
            const message = createMessage();
            message.markSent();

            message.markDelivered();

            expect(message.status).toBe(MessageStatus.DELIVERED);
            expect(message.deliveredAt).toBeInstanceOf(Date);
        });

        it("should throw when message is not sent", () => {
            const message = createMessage();

            expect(() => message.markDelivered()).toThrow("CANNOT_DELIVER_FROM_STATE");
        });
    });

    describe("markCancelled", () => {
        it("should mark message as cancelled", () => {
            const message = createMessage();

            message.markCancelled();

            expect(message.status).toBe(MessageStatus.CANCELLED);
            expect(message.cancelledAt).toBeInstanceOf(Date);
        });
    });

    describe("markFailed", () => {
        it("should mark a non-delivered message as failed", () => {
            const message = createMessage();

            message.markFailed({ reason: FailureReason.PROVIDER, error: "provider timeout" });

            expect(message.status).toBe(MessageStatus.FAILED);
            expect(message.failedAt).toBeInstanceOf(Date);
            expect(message.failureReason).toBe(FailureReason.PROVIDER);
            expect(message.error).toBe("provider timeout");
        });

        it("should allow failure without error message", () => {
            const message = createMessage();

            message.markFailed({ reason: FailureReason.INTERNAL });

            expect(message.status).toBe(MessageStatus.FAILED);
            expect(message.failureReason).toBe(FailureReason.INTERNAL);
            expect(message.error).toBeUndefined();
        });

        it("should throw when delivered message is failed", () => {
            const message = createMessage();
            message.markSent();
            message.markDelivered();

            expect(() => message.markFailed({ reason: FailureReason.PROVIDER })).toThrow("CANNOT_FAIL_DELIVERED");
        });
    });

    describe("markRead", () => {
        it("should mark in-app message as read", () => {
            const message = createMessage({ channelType: ChannelType.IN_APP, address: "account-id" });

            message.markRead();

            expect(message.readAt).toBeInstanceOf(Date);
        });

        it("should throw for non-in-app message", () => {
            const message = createMessage({ channelType: ChannelType.EMAIL });

            expect(() => message.markRead()).toThrow("READ_STATE_IN_APP_ONLY");
        });

        it("should throw when message is already read", () => {
            const message = createMessage({ channelType: ChannelType.IN_APP, address: "account-id" });
            message.markRead();

            expect(() => message.markRead()).toThrow("ALREADY_READ");
        });
    });
});
