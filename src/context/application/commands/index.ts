import { ClassProvider } from "@nestjs/common";

import { NotificationCommands } from "./notification.commands";
import { PreferenceCommands } from "./preference.commands";
import { RecipientCommands } from "./recipient.commands";
import { ChannelCommands } from "./channel.commands";
import { MessageCommands } from "./message.commands";
import {
    NOTIFICATION_COMMANDS,
    PREFERENCE_COMMANDS,
    RECIPIENT_COMMANDS,
    CHANNEL_COMMANDS,
    MESSAGE_COMMANDS,
} from "./tokens";

export const COMMANDS: ClassProvider[] = [
    {
        provide: NOTIFICATION_COMMANDS,
        useClass: NotificationCommands,
    },
    {
        provide: PREFERENCE_COMMANDS,
        useClass: PreferenceCommands,
    },
    {
        provide: RECIPIENT_COMMANDS,
        useClass: RecipientCommands,
    },
    {
        provide: CHANNEL_COMMANDS,
        useClass: ChannelCommands,
    },
    {
        provide: MESSAGE_COMMANDS,
        useClass: MessageCommands,
    },
];

export { NOTIFICATION_COMMANDS, PREFERENCE_COMMANDS, RECIPIENT_COMMANDS, CHANNEL_COMMANDS, MESSAGE_COMMANDS };
