import { ClassProvider } from "@nestjs/common";

import { NotificationQueries } from "./notification.queries";
import { PreferenceQueries } from "./preference.queries";
import { RecipientQueries } from "./recipient.queries";
import { ChannelQueries } from "./channel.queries";
import { MessageQueries } from "./message.queries";

export const NOTIFICATION_QUERIES = Symbol("Queries.Notification.Contract");
export const PREFERENCE_QUERIES = Symbol("Queries.Preference.Contract");
export const RECIPIENT_QUERIES = Symbol("Queries.Recipient.Contract");
export const CHANNEL_QUERIES = Symbol("Queries.Channel.Contract");
export const MESSAGE_QUERIES = Symbol("Queries.Message.Contract");

export const QUERIES: ClassProvider[] = [
    {
        provide: NOTIFICATION_QUERIES,
        useClass: NotificationQueries,
    },
    {
        provide: PREFERENCE_QUERIES,
        useClass: PreferenceQueries,
    },
    {
        provide: RECIPIENT_QUERIES,
        useClass: RecipientQueries,
    },
    {
        provide: CHANNEL_QUERIES,
        useClass: ChannelQueries,
    },
    {
        provide: MESSAGE_QUERIES,
        useClass: MessageQueries,
    },
];
