import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { ChannelType } from "~context/enums";

import { Recipient } from "./recipient.entity";
import { Channel } from "./channel.entity";

const ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";

function createRecipient(overrides?: Partial<Entities.Recipient.ConstructorProps>): Recipient {
    return new Recipient({
        account: ACCOUNT_ID,
        timezone: "UTC",
        locale: "en",
        ...overrides,
    });
}

function createChannel(
    recipient: Recipient,
    overrides?: Partial<Omit<Entities.Channel.ConstructorProps, "recipient">>,
): Channel {
    return new Channel({
        type: ChannelType.EMAIL,
        address: "user@example.com",
        isVerified: true,
        recipient,
        ...overrides,
    });
}

describe("Recipient Entity", () => {
    describe("constructor", () => {
        it("should assign required fields", () => {
            const recipient = createRecipient({
                account: "00000000-0000-4000-8000-000000000002",
                timezone: "Europe/Moscow",
                locale: "ru",
            });

            expect(recipient.account).toBe("00000000-0000-4000-8000-000000000002");
            expect(recipient.timezone).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("ru");
        });

        it("should initialize relation collections", () => {
            const recipient = createRecipient();

            expect(recipient.channels.length).toBe(0);
            expect(recipient.notifications.length).toBe(0);
            expect(recipient.preferences.length).toBe(0);
        });

        it("should auto-generate id, createdAt, version", () => {
            const recipient = createRecipient();

            expect(isUUID(recipient.id, "4")).toBe(true);
            expect(recipient.createdAt).toBeInstanceOf(Date);
            expect(recipient.version).toBe(1);
            expect(recipient.updatedAt).toBeUndefined();
            expect(recipient.defaultOtpChannel).toBeUndefined();
        });
    });

    describe("update", () => {
        it("should update a single field", () => {
            const recipient = createRecipient({ timezone: "UTC" });

            recipient.update({ patch: { timezone: "Europe/Moscow" } });

            expect(recipient.timezone).toBe("Europe/Moscow");
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });

        it("should update multiple fields at once", () => {
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            recipient.update({ patch: { timezone: "Europe/Moscow", locale: "ru" } });

            expect(recipient.timezone).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("ru");
        });

        it("should skip unchanged fields", () => {
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            recipient.update({ patch: { timezone: "UTC", locale: "ru" } });

            expect(recipient.timezone).toBe("UTC");
            expect(recipient.locale).toBe("ru");
        });

        it("should ignore undefined values in patch", () => {
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            recipient.update({ patch: { timezone: "Europe/Moscow", locale: undefined } });

            expect(recipient.timezone).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("en");
        });

        it("should throw EMPTY_UPDATE_PATCH when patch object is empty", () => {
            const recipient = createRecipient();

            expect(() => recipient.update({ patch: {} })).toThrow("EMPTY_UPDATE_PATCH");
        });

        it("should throw NO_CHANGES_DETECTED when all values match current state", () => {
            const recipient = createRecipient({ timezone: "UTC" });

            expect(() => recipient.update({ patch: { timezone: "UTC" } })).toThrow("NO_CHANGES_DETECTED");
        });
    });

    describe("selectOtpChannel", () => {
        it("should select verified email channel", () => {
            const recipient = createRecipient();
            const channel = createChannel(recipient);

            recipient.selectOtpChannel(channel);

            expect(recipient.defaultOtpChannel).toBe(channel);
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });

        it("should select verified sms channel", () => {
            const recipient = createRecipient();
            const channel = createChannel(recipient, { type: ChannelType.SMS, address: "+15551234567" });

            recipient.selectOtpChannel(channel);

            expect(recipient.defaultOtpChannel).toBe(channel);
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });

        it("should throw when channel belongs to another recipient", () => {
            const recipient = createRecipient();
            const anotherRecipient = createRecipient({ account: "00000000-0000-4000-8000-000000000002" });
            const channel = createChannel(anotherRecipient);

            expect(() => recipient.selectOtpChannel(channel)).toThrow("NOT_OWN_CHANNEL");
        });

        it("should throw when channel is not verified", () => {
            const recipient = createRecipient();
            const channel = createChannel(recipient, { isVerified: false });

            expect(() => recipient.selectOtpChannel(channel)).toThrow("CHANNEL_NOT_VERIFIED");
        });

        it("should throw for in-app channel", () => {
            const recipient = createRecipient();
            const channel = createChannel(recipient, { type: ChannelType.IN_APP, address: undefined });

            expect(() => recipient.selectOtpChannel(channel)).toThrow("UNSUPPORTED_OTP_CHANNEL_TYPE");
        });
    });

    describe("clearOtpChannel", () => {
        it("should clear selected otp channel", () => {
            const recipient = createRecipient();
            const channel = createChannel(recipient);
            recipient.selectOtpChannel(channel);

            recipient.clearOtpChannel();

            expect(recipient.defaultOtpChannel).toBeUndefined();
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });
    });
});
