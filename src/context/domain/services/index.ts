import { ClassProvider } from "@nestjs/common";

import { NotificationService } from "./notification.service";
import { PreferenceService } from "./preference.service";
import { ChangeLogService } from "./change-log.service";
import { RecipientService } from "./recipient.service";
import { AuditLogService } from "./audit-log.service";
import { DispatchService } from "./dispatch.service";
import { ChannelService } from "./channel.service";
import { MessageService } from "./message.service";

export const NOTIFICATION_SERVICE = Symbol("Services.Notification.Contract");
export const CHANGE_LOG_SERVICE = Symbol("Services.ChangeLog.Contract");
export const PREFERENCE_SERVICE = Symbol("Services.Preference.Contract");
export const RECIPIENT_SERVICE = Symbol("Services.Recipient.Contract");
export const AUDIT_LOG_SERVICE = Symbol("Services.AuditLog.Contract");
export const DISPATCH_SERVICE = Symbol("Services.Dispatch.Contract");
export const CHANNEL_SERVICE = Symbol("Services.Channel.Contract");
export const MESSAGE_SERVICE = Symbol("Services.Message.Contract");

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
