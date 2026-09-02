import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import { ChannelType } from "~context/enums";

export class Recipient implements Entities.Recipient.Contract {
    private static readonly dictionaryPath = "entities.recipient";

    public id: string;
    public createdAt: Date;
    public updatedAt?: Date;
    public version: number = 1;

    public timezone: string;
    public account: string;
    public locale: string;

    public defaultOtpChannel?: Entities.Channel;

    public preferences = new Collection<Entities.Preference>(this);
    public notifications = new Collection<Entities.Notification>(this);
    public channels = new Collection<Entities.Channel>(this);

    public constructor(props: Entities.Recipient.ConstructorProps) {
        this.createdAt = new Date();
        this.id = randomUUID();

        this.timezone = props.timezone;
        this.account = props.account;
        this.locale = props.locale;
    }

    public update({ patch }: Entities.Recipient.ChangeDataProps): void {
        const now = new Date();
        let affected = 0;
        for (const [key, value] of Object.typedEntries(patch)) {
            if (typeof value !== "undefined" && value !== this[key]) {
                (this[key] as unknown) = value;
                ++affected;
            }
        }

        if (affected) {
            this.updatedAt = now;
        } else if (Object.keys(patch).length) {
            throw Exception.invariantViolation({ messageKey: `${Recipient.dictionaryPath}.NO_CHANGES_DETECTED` });
        } else {
            throw Exception.invariantViolation({ messageKey: `${Recipient.dictionaryPath}.EMPTY_UPDATE_PATCH` });
        }
    }

    public selectOtpChannel(channel: Entities.Channel): void {
        if (channel.recipient.id !== this.id) {
            throw Exception.invariantViolation({ messageKey: `${Recipient.dictionaryPath}.NOT_OWN_CHANNEL` });
        } else if (!channel.isVerified) {
            throw Exception.invariantViolation({ messageKey: `${Recipient.dictionaryPath}.CHANNEL_NOT_VERIFIED` });
        } else if (channel.type === ChannelType.IN_APP) {
            throw Exception.invariantViolation({ messageKey: `${Recipient.dictionaryPath}.UNSUPPORTED_OTP_CHANNEL_TYPE` });
        } else {
            this.defaultOtpChannel = channel;
            this.updatedAt = new Date();
        }
    }

    public clearOtpChannel(): void {
        this.defaultOtpChannel = undefined;
        this.updatedAt = new Date();
    }
}
