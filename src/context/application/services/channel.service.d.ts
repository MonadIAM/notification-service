import { ChannelType } from "~context/enums";

declare global {
    namespace Services {
        namespace Channel {
            interface Contract {
                markVerified(props: MarkVerified.Props): MarkVerified.Result;
                toggleSound(props: ToggleSound.Props): ToggleSound.Result;
                create(props: Create.Props): Create.Result;
                purge(props: Purge.Props): Purge.Result;
            }

            namespace Create {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        recipient: Entities.Recipient;
                        sourceIdentifier?: string;
                        isVerified?: boolean;
                        type: ChannelType;
                        address?: string;
                    };
                };

                type Result = Entities.Channel;
            }

            namespace MarkVerified {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        channel: Entities.Channel;
                    };
                };

                type Result = void;
            }

            namespace ToggleSound {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        channel: Entities.Channel;
                    };
                };

                type Result = void;
            }

            namespace Purge {
                type Props = {
                    transaction: ORM.EntityManager;
                    input: {
                        channels: Entities.Channel[];
                    };
                };

                type Result = void;
            }
        }
    }
}
