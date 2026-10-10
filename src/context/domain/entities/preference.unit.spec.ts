import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { NotificationCategory, ChannelType } from "~context/enums";

import { Preference } from "./preference.entity";

const entities = new EntityFactoryRegistry();

function createPreference(overrides?: Partial<Entities.Preference.ConstructorProps>): Preference {
    return new Preference({
        category: NotificationCategory.SYSTEM,
        channelType: ChannelType.EMAIL,
        recipient: entities.createRecipient(),
        ...overrides,
    });
}

describe("[Entity] - Preference", () => {
    describe("[Method] - constructor", () => {
        it("[case] - assigns required fields and relations", () => {
            // Arrange
            const recipient = entities.createRecipient();

            // Act
            const preference = createPreference({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.SMS,
                recipient,
            });
            const result = preference.category;
            const result1 = preference.channelType;

            // Assert
            expect(result).toBe(NotificationCategory.INVITES);
            expect(result1).toBe(ChannelType.SMS);
            expect(preference.recipient).toBe(recipient);
        });

        it("[case] - defaults isDuplicationEnabled to true", () => {
            // Arrange

            // Act
            const preference = createPreference();

            // Assert
            expect(preference.isDuplicationEnabled).toBe(true);
        });

        it("[case] - respects explicit isDuplicationEnabled override", () => {
            // Arrange

            // Act
            const preference = createPreference({ isDuplicationEnabled: false });

            // Assert
            expect(preference.isDuplicationEnabled).toBe(false);
        });

        it("[case] - autos-generate id, createdAt, version", () => {
            // Arrange

            // Act
            const preference = createPreference();
            const result = isUUID(preference.id, "4");
            const result1 = preference.createdAt;
            const result2 = preference.version;

            // Assert
            expect(result).toBe(true);
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBe(1);
            expect(preference.updatedAt).toBeUndefined();
        });
    });

    describe("[Method] - toggle", () => {
        it("[case] - toggles duplication off", () => {
            // Arrange
            const preference = createPreference();

            // Act
            preference.toggle();
            const result = preference.isDuplicationEnabled;

            // Assert
            expect(result).toBe(false);
            expect(preference.updatedAt).toBeInstanceOf(Date);
        });

        it("[case] - toggles duplication back on repeated call", () => {
            // Arrange
            const preference = createPreference();

            // Act
            preference.toggle();
            preference.toggle();
            const result = preference.isDuplicationEnabled;

            // Assert
            expect(result).toBe(true);
            expect(preference.updatedAt).toBeInstanceOf(Date);
        });
    });
});
