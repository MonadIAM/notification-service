import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { ChannelType } from "~context/enums";

import { Recipient } from "./recipient.entity";

const ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";

const entities = new EntityFactoryRegistry();

function createRecipient(overrides?: Partial<Entities.Recipient.ConstructorProps>): Recipient {
    return new Recipient({
        account: ACCOUNT_ID,
        timezone: "UTC",
        locale: "en",
        ...overrides,
    });
}

describe("[Entity] - Recipient", () => {
    describe("[Method] - constructor", () => {
        it("[case] - assigns required fields", () => {
            // Arrange

            // Act
            const recipient = createRecipient({
                account: "00000000-0000-4000-8000-000000000002",
                timezone: "Europe/Moscow",
                locale: "ru",
            });
            const result = recipient.account;
            const result1 = recipient.timezone;

            // Assert
            expect(result).toBe("00000000-0000-4000-8000-000000000002");
            expect(result1).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("ru");
        });

        it("[case] - initializes relation collections", () => {
            // Arrange

            // Act
            const recipient = createRecipient();
            const result = recipient.channels.length;
            const result1 = recipient.notifications.length;

            // Assert
            expect(result).toBe(0);
            expect(result1).toBe(0);
            expect(recipient.preferences.length).toBe(0);
        });

        it("[case] - autos-generate id, createdAt, version", () => {
            // Arrange

            // Act
            const recipient = createRecipient();
            const result = isUUID(recipient.id, "4");
            const result1 = recipient.createdAt;
            const result2 = recipient.version;
            const result3 = recipient.updatedAt;

            // Assert
            expect(result).toBe(true);
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBe(1);
            expect(result3).toBeUndefined();
            expect(recipient.defaultOtpChannel).toBeUndefined();
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates a single field", () => {
            // Arrange
            const recipient = createRecipient({ timezone: "UTC" });

            // Act
            recipient.update({ patch: { timezone: "Europe/Moscow" } });
            const result = recipient.timezone;

            // Assert
            expect(result).toBe("Europe/Moscow");
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - updates multiple fields at once", () => {
            // Arrange
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            // Act
            recipient.update({ patch: { timezone: "Europe/Moscow", locale: "ru" } });
            const result = recipient.timezone;

            // Assert
            expect(result).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("ru");
        });

        it("[case] - skips unchanged fields", () => {
            // Arrange
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            // Act
            recipient.update({ patch: { timezone: "UTC", locale: "ru" } });
            const result = recipient.timezone;

            // Assert
            expect(result).toBe("UTC");
            expect(recipient.locale).toBe("ru");
        });

        it("[case] - ignores undefined values in patch", () => {
            // Arrange
            const recipient = createRecipient({ timezone: "UTC", locale: "en" });

            // Act
            recipient.update({ patch: { timezone: "Europe/Moscow", locale: undefined } });
            const result = recipient.timezone;

            // Assert
            expect(result).toBe("Europe/Moscow");
            expect(recipient.locale).toBe("en");
        });

        it("[case] - throws EMPTY_UPDATE_PATCH when patch object is empty", () => {
            // Arrange
            const recipient = createRecipient();

            // Act
            const act = (): unknown => recipient.update({ patch: {} });

            // Assert
            expect(act).toThrow("EMPTY_UPDATE_PATCH");
        });

        it("[case] - throws NO_CHANGES_DETECTED when all values match current state", () => {
            // Arrange
            const recipient = createRecipient({ timezone: "UTC" });

            // Act
            const act = (): unknown => recipient.update({ patch: { timezone: "UTC" } });

            // Assert
            expect(act).toThrow("NO_CHANGES_DETECTED");
        });
    });

    describe("[Method] - selectOtpChannel", () => {
        it.each([
            { type: ChannelType.EMAIL, address: "user@example.com" },
            { type: ChannelType.SMS, address: "+15551234567" },
        ])("[case] - selects a verified $type channel", ({ type, address }) => {
            // Arrange
            const recipient = createRecipient();
            const channel = entities.createChannel({ recipient, type, address });

            // Act
            recipient.selectOtpChannel(channel);
            const result = recipient.defaultOtpChannel;

            // Assert
            expect(result).toBe(channel);
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - throws when channel belongs to another recipient", () => {
            // Arrange
            const recipient = createRecipient();
            const anotherRecipient = createRecipient({ account: "00000000-0000-4000-8000-000000000002" });
            const channel = entities.createChannel({ recipient: anotherRecipient, type: ChannelType.EMAIL });

            // Act
            const act = (): unknown => recipient.selectOtpChannel(channel);

            // Assert
            expect(act).toThrow("NOT_OWN_CHANNEL");
        });

        it("[case] - throws when channel is not verified", () => {
            // Arrange
            const recipient = createRecipient();
            const channel = entities.createChannel({ recipient, type: ChannelType.EMAIL, isVerified: false });

            // Act
            const act = (): unknown => recipient.selectOtpChannel(channel);

            // Assert
            expect(act).toThrow("CHANNEL_NOT_VERIFIED");
        });

        it("[case] - throws for in-app channel", () => {
            // Arrange
            const recipient = createRecipient();
            const channel = entities.createChannel({ recipient, type: ChannelType.IN_APP, address: undefined });

            // Act
            const act = (): unknown => recipient.selectOtpChannel(channel);

            // Assert
            expect(act).toThrow("UNSUPPORTED_OTP_CHANNEL_TYPE");
        });
    });

    describe("[Method] - clearOtpChannel", () => {
        it("[case] - clears selected otp channel", () => {
            // Arrange
            const recipient = createRecipient();
            const channel = entities.createChannel({ recipient, type: ChannelType.EMAIL, address: "user@example.com" });
            recipient.selectOtpChannel(channel);

            // Act
            recipient.clearOtpChannel();
            const result = recipient.defaultOtpChannel;

            // Assert
            expect(result).toBeUndefined();
            expect(recipient.updatedAt).toBeInstanceOf(Date);
        });
    });
});
