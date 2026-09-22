import { describe, it, expect } from "@jest/globals";
import { isUUID } from "class-validator";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { NotificationCategory, PlatformService } from "~context/enums";

import { Notification } from "./notification.entity";

const entities = new EntityFactoryRegistry();

function createNotification(overrides?: Partial<Entities.Notification.ConstructorProps>): Notification {
    return new Notification({
        sourceService: PlatformService.IDENTITY_SERVICE,
        category: NotificationCategory.SECURITY,
        recipient: entities.createRecipient(),
        template: "LOGIN_ALERT",
        ...overrides,
    });
}

describe("Notification Entity", () => {
    describe("constructor", () => {
        it("should assign required fields and relations", () => {
            const recipient = entities.createRecipient();

            const notification = createNotification({
                sourceService: PlatformService.ACCESS_CONTROL_SERVICE,
                category: NotificationCategory.INVITES,
                template: "INVITE_RECEIVED",
                recipient,
            });

            expect(notification.sourceService).toBe(PlatformService.ACCESS_CONTROL_SERVICE);
            expect(notification.category).toBe(NotificationCategory.INVITES);
            expect(notification.template).toBe("INVITE_RECEIVED");
            expect(notification.recipient).toBe(recipient);
        });

        it("should assign optional fields when provided", () => {
            const notification = createNotification({
                dedupKey: "dedup-1",
                realm: "00000000-0000-4000-8000-000000000002",
                title: "Security alert",
                body: "New login detected",
            });

            expect(notification.dedupKey).toBe("dedup-1");
            expect(notification.realm).toBe("00000000-0000-4000-8000-000000000002");
            expect(notification.title).toBe("Security alert");
            expect(notification.body).toBe("New login detected");
        });

        it("should leave optional fields undefined when omitted", () => {
            const notification = createNotification();

            expect(notification.dedupKey).toBeUndefined();
            expect(notification.realm).toBeUndefined();
            expect(notification.title).toBeUndefined();
            expect(notification.body).toBeUndefined();
        });

        it("should initialize messages as empty collection", () => {
            const notification = createNotification();

            expect(notification.messages.length).toBe(0);
        });

        it("should auto-generate id, createdAt, version", () => {
            const notification = createNotification();

            expect(isUUID(notification.id, "4")).toBe(true);
            expect(notification.createdAt).toBeInstanceOf(Date);
            expect(notification.version).toBe(1);
        });
    });
});
