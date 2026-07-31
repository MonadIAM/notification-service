import { EntitySchema } from "@mikro-orm/core";

import { Notification, Recipient, Message } from "~context/domain/entities";
import { NotificationCategory, PlatformService } from "~context/enums";

export const NotificationSchema = new EntitySchema<Notification>({
    class: Notification,
    tableName: "notification",
    schema: "notification",

    uniques: [
        {
            name: "notification_recipient_dedup_key_unique",
            properties: ["recipient", "dedupKey"],
        },
    ],

    indexes: [
        {
            name: "notification_realm_idx",
            properties: ["realm"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        sourceService: { enum: true, items: () => PlatformService, nativeEnumName: "notification_source_service" },
        category: { enum: true, items: () => NotificationCategory, nativeEnumName: "notification_category" },

        dedupKey: { type: "text", nullable: true },
        realm: { type: "uuid", nullable: true },
        title: { type: "text", nullable: true },
        body: { type: "text", nullable: true },
        template: { type: "text" },

        recipient: {
            kind: "m:1",
            entity: () => Recipient,
            fieldName: "recipient_id",
            inversedBy: "notifications",
            deleteRule: "cascade",
        },

        messages: {
            kind: "1:m",
            entity: () => Message,
            mappedBy: "notification",
        },

        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
