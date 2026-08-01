declare namespace Entities {
    type Recipient = Recipient.Contract;

    namespace Recipient {
        interface Contract {
            id: string;
            createdAt: Date;
            updatedAt?: Date;
            version: number;

            account: string;
            timezone: string;
            locale: string;

            defaultOtpChannel?: Entities.Channel;

            channels: ORM.Collection<Entities.Channel>;
            notifications: ORM.Collection<Entities.Notification>;
            preferences: ORM.Collection<Entities.Preference>;

            selectOtpChannel(channel: Entities.Channel): void;
            update(props: ChangeDataProps): void;
            clearOtpChannel(): void;
        }

        type MutableFields = Pick<Contract, "timezone" | "locale">;

        type ConstructorProps = {
            timezone: string;
            account: string;
            locale: string;
        };

        type ChangeDataProps = {
            patch: Partial<MutableFields>;
        };
    }
}
