import { JWTPayload } from "jose";

declare global {
    namespace CommonServices {
        namespace JWT {
            interface Contract {
                verifyAccess(token: string): Promise<JWTPayload>;
            }
        }

        namespace Email {
            interface Contract {
                send(props: Send): Promise<void>;
            }

            type Send = {
                subject: string;
                html: string;
                to: string;
            };
        }

        namespace SMS {
            interface Contract {
                send(props: Send): Promise<void>;
            }

            type Send = {
                body: string;
                to: string;
            };
        }
    }
}
