import { NotificationCategory, ChannelType } from "./enums";

export { SYSTEM_REALM_ID } from "@monadiam/shared";

export const DUPLICATABLE_CHANNEL_TYPES: readonly ChannelType[] = [ChannelType.EMAIL];

export const CONFIGURABLE_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
    NotificationCategory.INVITES,
    NotificationCategory.SYSTEM,
    NotificationCategory.OTHER,
];
