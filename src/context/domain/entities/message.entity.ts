import { randomUUID } from "node:crypto";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";

export class Message implements Entities.Message.Contract {
    public id: string;
    public deliveredAt?: Date;
    public createdAt: Date;
    public failedAt?: Date;
    public readAt?: Date;
    public sentAt?: Date;
    public version: number = 1;

    public address: string;
    public channelType: ChannelType;
    public status: MessageStatus;
    public retryCount: number;

    public failureReason?: FailureReason;
    public error?: string;

    public notification: Entities.Notification;
    public channel?: Entities.Channel;

    public constructor(props: Entities.Message.ConstructorProps) {
        this.createdAt = new Date();
        this.id = randomUUID();

        this.status = MessageStatus.QUEUED;
        this.retryCount = 0;

        this.channelType = props.channelType;
        this.address = props.address;

        this.notification = props.notification;
        this.channel = props.channel;
    }
}
