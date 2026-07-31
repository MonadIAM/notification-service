import { EntitySchema } from "@mikro-orm/core";

import { Notification, Preference, Recipient, Channel } from "~context/domain/entities";

export const RecipientSchema = new EntitySchema<Recipient>({
    class: Recipient,
    tableName: "recipient",
    schema: "notification",

    uniques: [
        {
            name: "recipient_account_unique",
            properties: ["account"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        timezone: { type: "text" },
        account: { type: "uuid" },
        locale: { type: "text" },

        defaultOtpChannel: {
            kind: "m:1",
            entity: () => Channel,
            fieldName: "default_otp_channel_id",
            nullable: true,
            deleteRule: "set null",
        },

        channels: {
            kind: "1:m",
            entity: () => Channel,
            mappedBy: "recipient",
        },
        notifications: {
            kind: "1:m",
            entity: () => Notification,
            mappedBy: "recipient",
        },
        preferences: {
            kind: "1:m",
            entity: () => Preference,
            mappedBy: "recipient",
        },

        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
