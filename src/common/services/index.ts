import { ClassProvider } from "@nestjs/common";

import { VaultTransitService } from "./vault-transit.service";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { JWTService } from "./jwt.service";
import { VAULT_TRANSIT_SERVICE, EMAIL_SERVICE, SMS_SERVICE, JWT_SERVICE } from "./tokens";

export const COMMON_SERVICES: ClassProvider[] = [
    {
        provide: VAULT_TRANSIT_SERVICE,
        useClass: VaultTransitService,
    },
    {
        provide: EMAIL_SERVICE,
        useClass: EmailService,
    },
    {
        provide: SMS_SERVICE,
        useClass: SMSService,
    },
    {
        provide: JWT_SERVICE,
        useClass: JWTService,
    },
];

export { VAULT_TRANSIT_SERVICE, JWT_SERVICE, EMAIL_SERVICE, SMS_SERVICE };
