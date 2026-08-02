import { ClassProvider } from "@nestjs/common";

import { EMAIL_SERVICE, SMS_SERVICE, JWT_SERVICE } from "./tokens";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { JWTService } from "./jwt.service";

export const COMMON_SERVICES: ClassProvider[] = [
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

export { JWT_SERVICE, EMAIL_SERVICE, SMS_SERVICE };
