import { ClassProvider } from "@nestjs/common";

import {
    NOTIFICATION_SERVICE,
    CHANGE_LOG_SERVICE,
    PREFERENCE_SERVICE,
    RECIPIENT_SERVICE,
    AUDIT_LOG_SERVICE,
    DISPATCH_SERVICE,
    CHANNEL_SERVICE,
    MESSAGE_SERVICE,
} from "~context/application/services";

import { NotificationService } from "./notification.service";
import { PreferenceService } from "./preference.service";
import { ChangeLogService } from "./change-log.service";
import { RecipientService } from "./recipient.service";
import { AuditLogService } from "./audit-log.service";
import { DispatchService } from "./dispatch.service";
import { ChannelService } from "./channel.service";
import { MessageService } from "./message.service";

export const DOMAIN_SERVICES: ClassProvider[] = [
    {
        provide: NOTIFICATION_SERVICE,
        useClass: NotificationService,
    },
    {
        provide: PREFERENCE_SERVICE,
        useClass: PreferenceService,
    },
    {
        provide: RECIPIENT_SERVICE,
        useClass: RecipientService,
    },
    {
        provide: CHANGE_LOG_SERVICE,
        useClass: ChangeLogService,
    },
    {
        provide: AUDIT_LOG_SERVICE,
        useClass: AuditLogService,
    },
    {
        provide: DISPATCH_SERVICE,
        useClass: DispatchService,
    },
    {
        provide: CHANNEL_SERVICE,
        useClass: ChannelService,
    },
    {
        provide: MESSAGE_SERVICE,
        useClass: MessageService,
    },
];
