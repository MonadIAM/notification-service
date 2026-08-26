import { ClassProvider } from "@nestjs/common";

import { NotificationRepository } from "./notification.repository";
import { PreferenceRepository } from "./preference.repository";
import { ChangeLogRepository } from "./change-log.repository";
import { RecipientRepository } from "./recipient.repository";
import { AuditLogRepository } from "./audit-log.repository";
import { ChannelRepository } from "./channel.repository";
import { MessageRepository } from "./message.repository";

export const NOTIFICATION_REPOSITORY = Symbol("Repositories.Notification.Contract");
export const CHANGE_LOG_REPOSITORY = Symbol("Repositories.ChangeLog.Contract");
export const RECIPIENT_REPOSITORY = Symbol("Repositories.Recipient.Contract");
export const PREFERENCE_REPOSITORY = Symbol("Repositories.Preference.Contract");
export const AUDIT_LOG_REPOSITORY = Symbol("Repositories.AuditLog.Contract");
export const CHANNEL_REPOSITORY = Symbol("Repositories.Channel.Contract");
export const MESSAGE_REPOSITORY = Symbol("Repositories.Message.Contract");

export const REPOSITORIES: ClassProvider[] = [
    {
        provide: NOTIFICATION_REPOSITORY,
        useClass: NotificationRepository,
    },
    {
        provide: PREFERENCE_REPOSITORY,
        useClass: PreferenceRepository,
    },
    {
        provide: CHANGE_LOG_REPOSITORY,
        useClass: ChangeLogRepository,
    },
    {
        provide: RECIPIENT_REPOSITORY,
        useClass: RecipientRepository,
    },
    {
        provide: AUDIT_LOG_REPOSITORY,
        useClass: AuditLogRepository,
    },
    {
        provide: CHANNEL_REPOSITORY,
        useClass: ChannelRepository,
    },
    {
        provide: MESSAGE_REPOSITORY,
        useClass: MessageRepository,
    },
];
