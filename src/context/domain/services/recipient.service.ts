import { Injectable, Scope } from "@nestjs/common";

import { ChannelType } from "~context/enums";

import { Recipient, Channel } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientService implements Services.Recipient.Contract {
    public create(props: Services.Recipient.Create.Props): Services.Recipient.Create.Result {
        const { transaction, input } = props;
        const recipient = new Recipient({
            account: input.account,
            timezone: input.timezone,
            locale: input.locale,
        });

        transaction.persist(recipient);

        const channel = new Channel({
            type: ChannelType.IN_APP,
            isVerified: true,
            recipient,
        });

        transaction.persist(channel);

        return recipient;
    }

    public update(props: Services.Recipient.Update.Props): Services.Recipient.Update.Result {
        const { transaction, input } = props;
        input.recipient.update({ patch: input.patch });
        transaction.merge(input.recipient);
    }

    public selectOtpChannel(props: Services.Recipient.SelectOtpChannel.Props): Services.Recipient.SelectOtpChannel.Result {
        const { transaction, input } = props;
        input.recipient.selectOtpChannel(input.channel);
        transaction.merge(input.recipient);
    }

    public clearOtpChannel(props: Services.Recipient.ClearOtpChannel.Props): Services.Recipient.ClearOtpChannel.Result {
        const { transaction, input } = props;
        input.recipient.clearOtpChannel();
        transaction.merge(input.recipient);
    }

    public purge(props: Services.Recipient.Purge.Props): Services.Recipient.Purge.Result {
        const { transaction, input } = props;
        transaction.remove(input.recipient);
    }
}
