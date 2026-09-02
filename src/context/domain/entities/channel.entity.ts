import { randomUUID } from "node:crypto";

import { Exception } from "~common/exceptions";
import { ChannelType } from "~context/enums";

export class Channel implements Entities.Channel.Contract {
    private static readonly dictionaryPath = "entities.channel";

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
        this.verifiedAt = this.isVerified ? this.createdAt : undefined;
        this.soundEnabled = props.type === ChannelType.IN_APP ? true : undefined;

        this.recipient = props.recipient;
    }

    public markVerified(): void {
        if (this.isVerified) {
            throw Exception.invariantViolation({ messageKey: `${Channel.dictionaryPath}.ALREADY_VERIFIED` });
        } else {
            this.verifiedAt = new Date();
            this.isVerified = true;
        }
    }

    public toggleSound(): void {
        if (this.type === ChannelType.IN_APP) {
            this.soundEnabled = !this.soundEnabled;
            this.updatedAt = new Date();
        } else {
            throw Exception.invariantViolation({ messageKey: `${Channel.dictionaryPath}.SOUND_NOT_APPLICABLE` });
        }
    }
}
