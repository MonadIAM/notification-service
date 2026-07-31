import { EntitySchema } from "@mikro-orm/core";

import { Recipient, Channel } from "~context/domain/entities";
import { ChannelType } from "~context/enums";

export const ChannelSchema = new EntitySchema<Channel>({
    class: Channel,
    tableName: "channel",
    schema: "notification",

    uniques: [
        {
            name: "channel_recipient_type_unique",
            properties: ["recipient", "type"],
        },
    ],

    properties: {
        id: { primary: true, type: "uuid" },

        type: { enum: true, items: () => ChannelType, nativeEnumName: "channel_type" },
        sourceIdentifier: { type: "uuid", nullable: true },
        address: { type: "text", nullable: true },

        soundEnabled: { type: "boolean", nullable: true },
        isVerified: { type: "boolean" },

        recipient: {
            kind: "m:1",
            entity: () => Recipient,
            fieldName: "recipient_id",
            inversedBy: "channels",
            deleteRule: "cascade",
        },

        verifiedAt: { type: "timestamptz", length: 3, nullable: true },
        updatedAt: { type: "timestamptz", length: 3, nullable: true },
        createdAt: { type: "timestamptz", length: 3 },
        version: { type: "int", version: true },
    },
});
