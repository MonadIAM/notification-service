import { Inject, Injectable, Scope } from "@nestjs/common";

import { EMAIL_SERVICE, SMS_SERVICE } from "~common/services";
import { ChannelType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class DispatchService implements Services.Dispatch.Contract {
    public constructor(
        @Inject(EMAIL_SERVICE)
        private readonly emailService: CommonServices.Email.PublicContract,
        @Inject(SMS_SERVICE)
        private readonly smsService: CommonServices.SMS.PublicContract,
    ) {}

    public async send(props: Services.Dispatch.Send.Props): Services.Dispatch.Send.Result {
        const { message } = props;

        if (message.channelType === ChannelType.EMAIL) {
            await this.emailService.send({
                subject: message.notification.title ?? "",
                html: message.notification.body ?? "",
                to: message.address,
            });
        } else {
            await this.smsService.send({
                body: message.notification.body ?? "",
                to: message.address,
            });
        }
    }
}
