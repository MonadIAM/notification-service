import { ClassProvider } from "@nestjs/common";

import { NotificationCommands } from "./notification.commands";
import { PreferenceCommands } from "./preference.commands";
import { RecipientCommands } from "./recipient.commands";
import { ChannelCommands } from "./channel.commands";
import { MessageCommands } from "./message.commands";

export const NOTIFICATION_COMMANDS = Symbol("Commands.Notification.Contract");
export const PREFERENCE_COMMANDS = Symbol("Commands.Preference.Contract");
export const RECIPIENT_COMMANDS = Symbol("Commands.Recipient.Contract");
export const CHANNEL_COMMANDS = Symbol("Commands.Channel.Contract");
export const MESSAGE_COMMANDS = Symbol("Commands.Message.Contract");

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
