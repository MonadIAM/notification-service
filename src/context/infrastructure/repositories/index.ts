import { ClassProvider } from "@nestjs/common";

import {
    NOTIFICATION_REPOSITORY,
    CHANGE_LOG_REPOSITORY,
    RECIPIENT_REPOSITORY,
    PREFERENCE_REPOSITORY,
    AUDIT_LOG_REPOSITORY,
    CHANNEL_REPOSITORY,
    MESSAGE_REPOSITORY,
} from "~context/domain/repositories";

import { NotificationRepository } from "./notification.repository";
import { PreferenceRepository } from "./preference.repository";
import { ChangeLogRepository } from "./change-log.repository";
import { RecipientRepository } from "./recipient.repository";
import { AuditLogRepository } from "./audit-log.repository";
import { ChannelRepository } from "./channel.repository";
import { MessageRepository } from "./message.repository";

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
