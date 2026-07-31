import { randomUUID } from "node:crypto";

import { ChannelType } from "~context/enums";

export class Channel implements Entities.Channel.Contract {
    public id: string;
    public verifiedAt?: Date;
    public updatedAt?: Date;
    public createdAt: Date;
    public version: number = 1;

    public type: ChannelType;
    public sourceIdentifier?: string;
    public address?: string;

    public soundEnabled?: boolean;
    public isVerified: boolean;

    public recipient: Entities.Recipient;

    public constructor(props: Entities.Channel.ConstructorProps) {
        this.createdAt = new Date();
        this.id = randomUUID();

        this.sourceIdentifier = props.sourceIdentifier;
        this.address = props.address;
        this.type = props.type;

        this.isVerified = props.isVerified ?? false;

        this.recipient = props.recipient;
    }
}
