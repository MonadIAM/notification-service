import { ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Channel {
            interface Contract extends CommandContract {}

            interface CommandContract {
                markVerified: MarkVerified.Signature;
                toggleSound: ToggleSound.Signature;
                create: Create.Signature;
                purge: Purge.Signature;
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
