import { NotificationCategory, ChannelType, MessageTemplate } from "./enums";

export { SYSTEM_REALM_ID } from "@monadiam/shared";

export const DEFAULT_OAUTH_SCOPE = "";

export const DUPLICATABLE_CHANNEL_TYPES: readonly ChannelType[] = [ChannelType.EMAIL];

export const CONFIGURABLE_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
    NotificationCategory.INVITES,
    NotificationCategory.SYSTEM,
    NotificationCategory.OTHER,
];

export const CUSTOM_TEMPLATE = "CUSTOM";

export const OTP_MESSAGE_TEMPLATES: readonly string[] = [
    MessageTemplate.ACCOUNT_VERIFICATION_OTP,
    MessageTemplate.IDENTIFIER_VERIFICATION_OTP,
    MessageTemplate.RESET_PASSWORD_OTP,
    MessageTemplate.LOGIN_OTP,
];

export const DEBOUNCED_CATEGORIES: readonly NotificationCategory[] = [NotificationCategory.INVITES];

export const CONSUMER_META: Extract.Meta = {
    userAgent: "kafka-consumer",
    ip: "127.0.0.1",
};
