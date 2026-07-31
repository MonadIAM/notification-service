import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

export class Recipient implements Entities.Recipient.Contract {
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
}
