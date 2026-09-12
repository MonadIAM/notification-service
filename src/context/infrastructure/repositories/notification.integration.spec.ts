import { describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";

import { PublicLinkOperator, PublicStringOperator } from "~infrastructure/database/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { NotificationCategory, PlatformService } from "~context/enums";
import { postgresSuite } from "~testing/integration/postgres.suite";

import { NotificationRepository } from "./notification.repository";

describe("NotificationRepository", () => {
    const suite = postgresSuite({
        repository: ({ readManager }) => new NotificationRepository(readManager),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("maps the persisted notification through the schema", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const realm = randomUUID();
        const notification = await suite.fixtures().createNotification({
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SECURITY,
            body: "Mapping notification body",
            title: "Mapping Notification",
            dedupKey: "mapping-dedup-key",
            template: "mapping-template",
            recipient,
            realm,
        });

        const loaded = await suite.repository().findUniqueOrThrow({ where: { id: notification.id } });

        expect(loaded).toMatchObject({
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SECURITY,
            createdAt: notification.createdAt,
            body: "Mapping notification body",
            version: notification.version,
            title: "Mapping Notification",
            dedupKey: "mapping-dedup-key",
            template: "mapping-template",
            id: notification.id,
            realm,
        });
        expect(loaded.recipient.id).toBe(recipient.id);
    });

    it("finds notifications by recipient and source mapper filters", async () => {
        const realm = randomUUID();
        const recipient = await suite.fixtures().createRecipient();
        const matched = await suite.fixtures().createNotification({
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SECURITY,
            recipient,
            realm,
        });
        await suite.fixtures().createNotification({
            category: NotificationCategory.SYSTEM,
            recipient,
            realm,
        });

        const [notifications, total] = await suite.repository().findMany({
            pagination: { currentPage: 1, elementsPerPage: 10 },
            sort: { createdAt: QueryOrder.ASC },
            filters: {
                recipient: {
                    operator: PublicLinkOperator.EQUAL,
                    value: recipient.id,
                },
                sourceService: {
                    operator: PublicStringOperator.EQUAL,
                    value: PlatformService.IDENTITY_SERVICE,
                },
            },
        });

        expect(total).toBe(1);
        expect(notifications.map(({ id }) => id)).toEqual([matched.id]);
    });
});
