import { ChannelType } from "~context/enums";

declare global {
    namespace Entities {
        type Channel = Channel.Contract;

        namespace Channel {
            interface Contract {
                id: string;
                verifiedAt?: Date;
                updatedAt?: Date;
                createdAt: Date;
                version: number;

                type: ChannelType;
                sourceIdentifier?: string;
                address?: string;

                soundEnabled?: boolean;
                isVerified: boolean;

                recipient: Entities.Recipient;

                markVerified(): void;
                toggleSound(): void;
            }

            type ConstructorProps = {
                type: ChannelType;
                sourceIdentifier?: string;
                address?: string;

                isVerified?: boolean;

                recipient: Entities.Recipient;
            };
        }
    }
}
