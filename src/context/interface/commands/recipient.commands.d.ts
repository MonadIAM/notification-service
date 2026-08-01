declare namespace Commands {
    namespace Recipient {
        interface ControllerContract {
            update(props: Update.Props): Update.Result;
            selectOtpChannel(props: SelectOtpChannel.Props): SelectOtpChannel.Result;
        }

        interface ConsumerContract {
            create(props: Create.Props): Create.Result;
            purge(props: Purge.Props): Purge.Result;
        }

        interface Contract extends ControllerContract, ConsumerContract {}

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
        }

        namespace Create {
            type Props = {
                account: string;
                timezone: string;
                locale: string;
            };

            type Result = Promise<void>;
        }

        namespace Purge {
            type Props = {
                account: string;
            };

            type Result = Promise<void>;
        }
    }
}
