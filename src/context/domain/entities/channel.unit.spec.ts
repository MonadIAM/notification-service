import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { ChannelType } from "~context/enums";

import { Recipient } from "./recipient.entity";
import { Channel } from "./channel.entity";

function createRecipient(): Recipient {
    return new Recipient({
        account: "00000000-0000-4000-8000-000000000001",
        timezone: "UTC",
        locale: "en",
    });
}

function createChannel(overrides?: Partial<Entities.Channel.ConstructorProps>): Channel {
    return new Channel({
        type: ChannelType.EMAIL,
        address: "user@example.com",
        recipient: createRecipient(),
        ...overrides,
    });
}

describe("Channel Entity", () => {
    describe("constructor", () => {
        it("should assign required fields and relations", () => {
            const recipient = createRecipient();

            const channel = createChannel({
                sourceIdentifier: "identifier-1",
                address: "verified@example.com",
                type: ChannelType.EMAIL,
                recipient,
            });

            expect(channel.sourceIdentifier).toBe("identifier-1");
            expect(channel.address).toBe("verified@example.com");
            expect(channel.type).toBe(ChannelType.EMAIL);
            expect(channel.recipient).toBe(recipient);
        });

        it("should default isVerified to false", () => {
            const channel = createChannel();

            expect(channel.isVerified).toBe(false);
            expect(channel.verifiedAt).toBeUndefined();
        });

        it("should mark verifiedAt when created as verified", () => {
            const channel = createChannel({ isVerified: true });

            expect(channel.isVerified).toBe(true);
            expect(channel.verifiedAt).toBe(channel.createdAt);
        });

        it("should enable sound only for in-app channels", () => {
            const inApp = createChannel({ type: ChannelType.IN_APP, address: undefined });
            const email = createChannel({ type: ChannelType.EMAIL });

            expect(inApp.soundEnabled).toBe(true);
            expect(email.soundEnabled).toBeUndefined();
        });

        it("should auto-generate id, createdAt, version", () => {
            const channel = createChannel();

            expect(isUUID(channel.id, "4")).toBe(true);
            expect(channel.createdAt).toBeInstanceOf(Date);
            expect(channel.version).toBe(1);
            expect(channel.updatedAt).toBeUndefined();
        });
    });

    describe("markVerified", () => {
        it("should verify an unverified channel", () => {
            const channel = createChannel();

            channel.markVerified();

            expect(channel.isVerified).toBe(true);
            expect(channel.verifiedAt).toBeInstanceOf(Date);
        });

        it("should throw when already verified", () => {
            const channel = createChannel({ isVerified: true });

            expect(() => channel.markVerified()).toThrow("ALREADY_VERIFIED");
        });
    });

    describe("toggleSound", () => {
        it("should toggle sound for in-app channel", () => {
            const channel = createChannel({ type: ChannelType.IN_APP, address: undefined });

            channel.toggleSound();

            expect(channel.soundEnabled).toBe(false);
            expect(channel.updatedAt).toBeInstanceOf(Date);
        });

        it("should toggle sound back on repeated call", () => {
            const channel = createChannel({ type: ChannelType.IN_APP, address: undefined });

            channel.toggleSound();
            channel.toggleSound();

            expect(channel.soundEnabled).toBe(true);
            expect(channel.updatedAt).toBeInstanceOf(Date);
        });

        it("should throw for non-in-app channel", () => {
            const channel = createChannel({ type: ChannelType.EMAIL });

            expect(() => channel.toggleSound()).toThrow("SOUND_NOT_APPLICABLE");
        });
    });
});
