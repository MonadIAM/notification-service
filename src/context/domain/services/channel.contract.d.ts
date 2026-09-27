import { ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Channel {
            interface Contract extends CommandContract {}

            interface CommandContract {
                createForRecipient: CreateForRecipient.Signature;
                markVerified: MarkVerified.Signature;
                toggleSound: ToggleSound.Signature;
                create: Create.Signature;
                ensure: Ensure.Signature;
                purge: Purge.Signature;
            }

            namespace CreateForRecipient {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: Omit<Create.Props["input"], "account"> & {
                        recipient: Entities.Recipient;
                    };
                };

                type Result = Entities.Channel;

                type Signature = (props: Props) => Result;
            }

            namespace Ensure {
                type Props = CreateForRecipient.Props;

                type Result = Entities.Channel;

                type Signature = (props: Props) => Result;
            }

            namespace MarkVerified {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        sourceIdentifier: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace ToggleSound {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        account: string;
                    };
                };

                type Result = Promise<Entities.Channel>;

                type Signature = (props: Props) => Result;
            }

            namespace Create {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        sourceIdentifier?: string;
                        isVerified?: boolean;
                        type: ChannelType;
                        address?: string;
                        account: string;
                    };
                };

                type Result = Promise<Entities.Channel>;

                type Signature = (props: Props) => Result;
            }

            namespace Purge {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        sourceIdentifier: string;
                    };
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
