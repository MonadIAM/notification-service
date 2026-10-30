import { ChannelType } from "~context/enums";

declare global {
    namespace Commands.Channel {
        interface Contract extends ControllerContract, ConsumerContract {}

        interface ControllerContract {
            toggleSound: ToggleSound.Signature;
        }

        namespace ToggleSound {
            type Props = {
                context: Extract.Meta;
                actor: string;
            };

            type Result = Promise<MessageResult>;

            type Signature = (props: Props) => Result;
        }

        interface ConsumerContract {
            markVerified: MarkVerified.Signature;
            confirmEmail: ConfirmEmail.Signature;
            selectEmail: SelectEmail.Signature;
            purgeEmail: PurgeEmail.Signature;
            create: Create.Signature;
            purge: Purge.Signature;
        }

        namespace ConfirmEmail {
            type Props = {
                incoming: TransactionManager.Service.IncomingMessage;
                context: Extract.Meta;
                input: Topics.Account.EmailVerifiedMessage["payload"];
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace SelectEmail {
            type Props = {
                incoming: TransactionManager.Service.IncomingMessage;
                context: Extract.Meta;
                input: Topics.Account.EmailSelectedMessage["payload"];
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace PurgeEmail {
            type Props = {
                incoming: TransactionManager.Service.IncomingMessage;
                context: Extract.Meta;
                input: Topics.Account.EmailPurgedMessage["payload"];
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace MarkVerified {
            type Props = {
                context: Extract.Meta;
                input: {
                    sourceIdentifier: string;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace Create {
            type Props = {
                context: Extract.Meta;
                input: {
                    sourceIdentifier: string;
                    type: ChannelType;
                    address?: string;
                    account: string;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace Purge {
            type Props = {
                context: Extract.Meta;
                input: {
                    sourceIdentifier: string;
                };
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }
    }
}
