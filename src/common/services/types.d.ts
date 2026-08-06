import { JWTPayload } from "jose";

declare global {
    namespace CommonServices {
        namespace JWT {
            interface Contract extends PublicContract {}

            interface PublicContract {
                verifyAccess: VerifyAccess.Signature;
            }

            namespace VerifyAccess {
                type Props = {
                    token: string;
                };

                type Result = Promise<JWTPayload>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Email {
            interface Contract extends PublicContract {}

            interface PublicContract {
                send: Send.Signature;
            }

            namespace Send {
                type Props = {
                    subject: string;
                    html: string;
                    to: string;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace SMS {
            interface Contract extends PublicContract {}

            interface PublicContract {
                send: Send.Signature;
            }

            namespace Send {
                type Props = {
                    body: string;
                    to: string;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
