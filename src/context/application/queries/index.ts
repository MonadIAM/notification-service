import { ClassProvider } from "@nestjs/common";

import {
    NOTIFICATION_QUERIES,
    PREFERENCE_QUERIES,
    RECIPIENT_QUERIES,
    CHANNEL_QUERIES,
    MESSAGE_QUERIES,
} from "~context/interface/queries";

import { NotificationQueries } from "./notification.queries";
import { PreferenceQueries } from "./preference.queries";
import { RecipientQueries } from "./recipient.queries";
import { ChannelQueries } from "./channel.queries";
import { MessageQueries } from "./message.queries";

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
