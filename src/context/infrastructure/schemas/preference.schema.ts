import { EntitySchema } from "@mikro-orm/core";

import { Preference, Recipient } from "~context/domain/entities";
import { NotificationCategory, ChannelType } from "~context/enums";

export const PreferenceSchema = new EntitySchema<Preference>({
    class: Preference,
    tableName: "preference",
    schema: "notification",

    uniques: [
        {
            name: "preference_recipient_channel_category_unique",
            properties: ["recipient", "channelType", "category"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        category: { enum: true, items: () => NotificationCategory, nativeEnumName: "notification_category" },
        channelType: { enum: true, items: () => ChannelType, nativeEnumName: "channel_type" },

        isEnabled: { type: "boolean" },

        recipient: {
            kind: "m:1",
            entity: () => Recipient,
            fieldName: "recipient_id",
            deleteRule: "cascade",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
