import { EntitySchema } from "@mikro-orm/core";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";
import { Notification, Channel, Message } from "~context/domain/entities";

export const MessageSchema = new EntitySchema<Message>({
    class: Message,
    tableName: "message",
    schema: "notification",

    indexes: [
        {
            name: "message_notification_idx",
            properties: ["notification"],
        },
        {
            name: "message_channel_idx",
            properties: ["channel"],
        },
        {
            name: "message_status_idx",
            properties: ["status"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        channelType: { enum: true, items: () => ChannelType, nativeEnumName: "channel_type" },
        status: { enum: true, items: () => MessageStatus, nativeEnumName: "message_status" },
        failureReason: {
            enum: true,
            items: () => FailureReason,
            nullable: true,
            nativeEnumName: "message_failure_reason",
        },

        retryCount: { type: "smallint" },
        error: { type: "text", nullable: true },
        address: { type: "text" },

        notification: {
            kind: "m:1",
            entity: () => Notification,
            fieldName: "notification_id",
            inversedBy: "messages",
            deleteRule: "cascade",
        },

        channel: {
            kind: "m:1",
            entity: () => Channel,
            fieldName: "channel_id",
            nullable: true,
            deleteRule: "set null",
        },

        deliveredAt: { type: "timestamptz", length: 3, nullable: true },
        failedAt: { type: "timestamptz", length: 3, nullable: true },
        readAt: { type: "timestamptz", length: 3, nullable: true },
        sentAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
