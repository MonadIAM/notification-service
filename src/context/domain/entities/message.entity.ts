import { randomUUID } from "node:crypto";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";
import { Exception } from "~common/exceptions";

export class Message implements Entities.Message.Contract {
    private get dictionaryPath(): string {
        return "entities.message";
    }

    public id: string;
    public cancelledAt?: Date;
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

    public markSent(): void {
        if (this.status === MessageStatus.QUEUED) {
            this.status = MessageStatus.SENT;
            this.sentAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.CANNOT_SEND_FROM_STATE` });
        }
    }

    public markDelivered(): void {
        if (this.status === MessageStatus.SENT) {
            this.status = MessageStatus.DELIVERED;
            this.deliveredAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.CANNOT_DELIVER_FROM_STATE` });
        }
    }

    public markCancelled(): void {
        this.status = MessageStatus.CANCELLED;
        this.cancelledAt = new Date();
    }

    public markFailed({ reason, error }: Entities.Message.MarkFailed.Props): void {
        if (this.status === MessageStatus.DELIVERED) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.CANNOT_FAIL_DELIVERED` });
        } else {
            this.status = MessageStatus.FAILED;
            this.failedAt = new Date();
            this.failureReason = reason;
            this.error = error;
        }
    }

    public markRead(): void {
        if (this.channelType !== ChannelType.IN_APP) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.READ_STATE_IN_APP_ONLY` });
        } else if (this.readAt) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.ALREADY_READ` });
        } else {
            this.readAt = new Date();
        }
    }
}
