declare namespace Commands {
    namespace Recipient {
        interface Contract extends ControllerContract, ConsumerContract {}

        interface ConsumerContract {
            create(props: Create.Props): Create.Result;
            confirm: Confirm.Signature;
            purge(props: Purge.Props): Purge.Result;
        }

        namespace Create {
            type Props = {
                context: Extract.Meta;
                input: {
                    account: string;
                    timezone: string;
                    locale: string;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace Confirm {
            type Props = {
                incoming: TransactionManager.Service.IncomingMessage;
                context: Extract.Meta;
                input: {
                    account: string;
                    identifier: Topics.Account.Identifier;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace Purge {
            type Props = {
                incoming?: TransactionManager.Service.IncomingMessage;
                context: Extract.Meta;
                input: {
                    account: string;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        interface ControllerContract {
            selectOtpChannel: SelectOtpChannel.Signature;
            update: Update.Signature;
        }

        namespace SelectOtpChannel {
            type Props = {
                context: Extract.Meta;
                actor: string;
                input: {
                    channel: string;
                };
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        namespace Update {
            type Props = {
                context: Extract.Meta;
                actor: string;
                input: {
                    timezone?: string;
                    locale?: string;
                };
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }
    }
}
