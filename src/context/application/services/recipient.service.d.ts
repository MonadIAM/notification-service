declare namespace Services {
    namespace Recipient {
        interface Contract extends CommandContract {}

        interface CommandContract {
            selectOtpChannel: SelectOtpChannel.Signature;
            clearOtpChannel: ClearOtpChannel.Signature;
            create: Create.Signature;
            update: Update.Signature;
            purge: Purge.Signature;
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

            type Signature = (props: Props) => Result;
        }

        namespace ClearOtpChannel {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    recipient: Entities.Recipient;
                };
            };

            type Result = void;

            type Signature = (props: Props) => Result;
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

            type Signature = (props: Props) => Result;
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

            type Signature = (props: Props) => Result;
        }

        namespace Purge {
            type Props = {
                transaction: ORM.EntityManager;
                input: {
                    recipient: Entities.Recipient;
                };
            };

            type Result = void;

            type Signature = (props: Props) => Result;
        }
    }
}
