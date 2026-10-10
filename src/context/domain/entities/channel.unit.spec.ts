import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { ChannelType } from "~context/enums";

import { Channel } from "./channel.entity";

const entities = new EntityFactoryRegistry();

function createChannel(overrides?: Partial<Entities.Channel.ConstructorProps>): Channel {
    return new Channel({
        type: ChannelType.EMAIL,
        address: "user@example.com",
        recipient: entities.createRecipient(),
        ...overrides,
    });
}

describe("[Entity] - Channel", () => {
    describe("[Method] - constructor", () => {
        it("[case] - assigns required fields and relations", () => {
            // Arrange
            const recipient = entities.createRecipient();

            // Act
            const channel = createChannel({
                sourceIdentifier: "identifier-1",
                address: "verified@example.com",
                type: ChannelType.EMAIL,
                recipient,
            });
            const result = channel.sourceIdentifier;
            const result1 = channel.address;
            const result2 = channel.type;

            // Assert
            expect(result).toBe("identifier-1");
            expect(result1).toBe("verified@example.com");
            expect(result2).toBe(ChannelType.EMAIL);
            expect(channel.recipient).toBe(recipient);
        });

        it("[case] - defaults isVerified to false", () => {
            // Arrange

            // Act
            const channel = createChannel();
            const result = channel.isVerified;

            // Assert
            expect(result).toBe(false);
            expect(channel.verifiedAt).toBeUndefined();
        });

        it("[case] - marks verifiedAt when created as verified", () => {
            // Arrange

            // Act
            const channel = createChannel({ isVerified: true });
            const result = channel.isVerified;

            // Assert
            expect(result).toBe(true);
            expect(channel.verifiedAt).toBe(channel.createdAt);
        });

        it("[case] - enables sound only for in-app channels", () => {
            // Arrange

            // Act
            const inApp = createChannel({ type: ChannelType.IN_APP, address: undefined });
            const email = createChannel({ type: ChannelType.EMAIL });
            const result = inApp.soundEnabled;

            // Assert
            expect(result).toBe(true);
            expect(email.soundEnabled).toBeUndefined();
        });

        it("[case] - autos-generate id, createdAt, version", () => {
            // Arrange

            // Act
            const channel = createChannel();
            const result = isUUID(channel.id, "4");
            const result1 = channel.createdAt;
            const result2 = channel.version;

            // Assert
            expect(result).toBe(true);
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBe(1);
            expect(channel.updatedAt).toBeUndefined();
        });
    });

    describe("[Method] - markVerified", () => {
        it("[case] - verifies an unverified channel", () => {
            // Arrange
            const channel = createChannel();

            // Act
            channel.markVerified();
            const result = channel.isVerified;

            // Assert
            expect(result).toBe(true);
            expect(channel.verifiedAt).toBeInstanceOf(Date);
        });

        it("[case] - throws when already verified", () => {
            // Arrange
            const channel = createChannel({ isVerified: true });

            // Act
            const act = (): unknown => channel.markVerified();

            // Assert
            expect(act).toThrow("ALREADY_VERIFIED");
        });
    });

    describe("[Method] - toggleSound", () => {
        it("[case] - toggles sound for in-app channel", () => {
            // Arrange
            const channel = createChannel({ type: ChannelType.IN_APP, address: undefined });

            // Act
            channel.toggleSound();
            const result = channel.soundEnabled;

            // Assert
            expect(result).toBe(false);
            expect(channel.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - toggles sound back on repeated call", () => {
            // Arrange
            const channel = createChannel({ type: ChannelType.IN_APP, address: undefined });

            // Act
            channel.toggleSound();
            channel.toggleSound();
            const result = channel.soundEnabled;

            // Assert
            expect(result).toBe(true);
            expect(channel.updatedAt).toBeInstanceOf(Date);
        });

        it.each([ChannelType.EMAIL, ChannelType.SMS])("[case] - rejects sound for %s", (type) => {
            // Arrange
            const channel = createChannel({ type });

            // Act
            const act = (): unknown => channel.toggleSound();

            // Assert
            expect(act).toThrow("SOUND_NOT_APPLICABLE");
        });
    });
});
