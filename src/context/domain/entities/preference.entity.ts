import { randomUUID } from "node:crypto";

import { NotificationCategory, ChannelType } from "~context/enums";

export class Preference implements Entities.Preference.Contract {
    public id: string;
    public createdAt: Date;
    public updatedAt?: Date;
    public version: number = 1;

    public channelType: ChannelType;
    public category: NotificationCategory;

    public isEnabled: boolean;

    public recipient: Entities.Recipient;

    public constructor(props: Entities.Preference.ConstructorProps) {
        this.createdAt = new Date();
        this.id = randomUUID();

        this.channelType = props.channelType;
        this.category = props.category;

        this.isEnabled = props.isEnabled ?? true;

        this.recipient = props.recipient;
    }
}
