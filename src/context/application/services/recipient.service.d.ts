declare namespace Services {
    namespace Recipient {
        interface Contract {
            selectOtpChannel(props: SelectOtpChannel.Props): SelectOtpChannel.Result;
            clearOtpChannel(props: ClearOtpChannel.Props): ClearOtpChannel.Result;
            create(props: Create.Props): Create.Result;
            update(props: Update.Props): Update.Result;
            purge(props: Purge.Props): Purge.Result;
        }

        namespace Create {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    timezone: string;
                    account: string;
                    locale: string;
                };
            };

            type Result = Entities.Recipient;
        }

        namespace Update {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    patch: Partial<Entities.Recipient.MutableFields>;
                    recipient: Entities.Recipient;
                };
            };

            type Result = void;
        }

        namespace SelectOtpChannel {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    recipient: Entities.Recipient;
                    channel: Entities.Channel;
                };
            };

            type Result = void;
        }

        namespace ClearOtpChannel {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    recipient: Entities.Recipient;
                };
            };

            type Result = void;
        }

        namespace Purge {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    recipient: Entities.Recipient;
                };
            };

            type Result = void;
        }
    }
}
