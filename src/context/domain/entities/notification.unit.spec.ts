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
        locale: null,
        ...overrides,
    });
}

describe("[Entity] - Notification", () => {
    describe("[Method] - constructor", () => {
        it("[case] - assigns required fields and relations", () => {
            // Arrange
            const recipient = entities.createRecipient();

            // Act
            const notification = createNotification({
                sourceService: PlatformService.ACCESS_CONTROL_SERVICE,
                category: NotificationCategory.INVITES,
                template: "INVITE_RECEIVED",
                recipient,
            });
            const result = notification.sourceService;
            const result1 = notification.category;
            const result2 = notification.template;

            // Assert
            expect(result).toBe(PlatformService.ACCESS_CONTROL_SERVICE);
            expect(result1).toBe(NotificationCategory.INVITES);
            expect(result2).toBe("INVITE_RECEIVED");
            expect(notification.recipient).toBe(recipient);
        });

        it("[case] - assigns optional fields when provided", () => {
            // Arrange

            // Act
            const notification = createNotification({
                dedupKey: "dedup-1",
                realm: "00000000-0000-4000-8000-000000000002",
                title: "Security alert",
                body: "New login detected",
            });
            const result = notification.dedupKey;
            const result1 = notification.realm;
            const result2 = notification.title;

            // Assert
            expect(result).toBe("dedup-1");
            expect(result1).toBe("00000000-0000-4000-8000-000000000002");
            expect(result2).toBe("Security alert");
            expect(notification.body).toBe("New login detected");
        });

        it("[case] - leaves optional fields undefined when omitted", () => {
            // Arrange

            // Act
            const notification = createNotification();
            const result = notification.dedupKey;
            const result1 = notification.realm;
            const result2 = notification.title;

            // Assert
            expect(result).toBeUndefined();
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
            expect(notification.body).toBeUndefined();
        });

        it("[case] - initializes messages as empty collection", () => {
            // Arrange

            // Act
            const notification = createNotification();

            // Assert
            expect(notification.messages.length).toBe(0);
        });

        it("[case] - autos-generate id, createdAt, version", () => {
            // Arrange

            // Act
            const notification = createNotification();
            const result = isUUID(notification.id, "4");
            const result1 = notification.createdAt;

            // Assert
            expect(result).toBe(true);
            expect(result1).toBeInstanceOf(Date);
            expect(notification.version).toBe(1);
        });
    });
});
