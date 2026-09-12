import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { NotificationCategory, ChannelType } from "~context/enums";

import { Preference } from "./preference.entity";
import { Recipient } from "./recipient.entity";

function createRecipient(): Recipient {
    return new Recipient({
        account: "00000000-0000-4000-8000-000000000001",
        timezone: "UTC",
        locale: "en",
    });
}

function createPreference(overrides?: Partial<Entities.Preference.ConstructorProps>): Preference {
    return new Preference({
        category: NotificationCategory.SYSTEM,
        channelType: ChannelType.EMAIL,
        recipient: createRecipient(),
        ...overrides,
    });
}

describe("Preference Entity", () => {
    describe("constructor", () => {
        it("should assign required fields and relations", () => {
            const recipient = createRecipient();

            const preference = createPreference({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.SMS,
                recipient,
            });

            expect(preference.category).toBe(NotificationCategory.INVITES);
            expect(preference.channelType).toBe(ChannelType.SMS);
            expect(preference.recipient).toBe(recipient);
        });

        it("should default isDuplicationEnabled to true", () => {
            const preference = createPreference();

            expect(preference.isDuplicationEnabled).toBe(true);
        });

        it("should respect explicit isDuplicationEnabled override", () => {
            const preference = createPreference({ isDuplicationEnabled: false });

            expect(preference.isDuplicationEnabled).toBe(false);
        });

        it("should auto-generate id, createdAt, version", () => {
            const preference = createPreference();

            expect(isUUID(preference.id, "4")).toBe(true);
            expect(preference.createdAt).toBeInstanceOf(Date);
            expect(preference.version).toBe(1);
            expect(preference.updatedAt).toBeUndefined();
        });
    });

    describe("toggle", () => {
        it("should toggle duplication off", () => {
            const preference = createPreference();

            preference.toggle();

            expect(preference.isDuplicationEnabled).toBe(false);
            expect(preference.updatedAt).toBeInstanceOf(Date);
        });

        it("should toggle duplication back on repeated call", () => {
            const preference = createPreference();

            preference.toggle();
            preference.toggle();

            expect(preference.isDuplicationEnabled).toBe(true);
            expect(preference.updatedAt).toBeInstanceOf(Date);
        });
    });
});
