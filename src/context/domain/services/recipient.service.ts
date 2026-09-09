import { Inject, Injectable, Scope } from "@nestjs/common";

import { RECIPIENT_REPOSITORY, CHANNEL_REPOSITORY } from "~context/infrastructure/repositories";
import { ChannelType } from "~context/enums";

import { Recipient, Channel } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientService implements Services.Recipient.Contract {
    public constructor(
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.Contract,
    ) {}

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

    public async update(props: Services.Recipient.Update.Props): Services.Recipient.Update.Result {
        const { transaction, input } = props;
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: input.account },
            transaction,
        });

        recipient.update({ patch: input.patch });

        return recipient;
    }

    public async selectOtpChannel(
        props: Services.Recipient.SelectOtpChannel.Props,
    ): Services.Recipient.SelectOtpChannel.Result {
        const { transaction, input } = props;
        const [recipient, channel] = await Promise.all([
            this.recipientRepository.findUniqueOrThrow({
                where: { account: input.account },
                transaction,
            }),
            this.channelRepository.findUniqueOrThrow({
                options: { populate: ["recipient"] },
                where: { id: input.channel },
                transaction,
            }),
        ]);

        recipient.selectOtpChannel(channel);

        return recipient;
    }

    public async purge(props: Services.Recipient.Purge.Props): Services.Recipient.Purge.Result {
        const { transaction, input } = props;
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: input.account },
            transaction,
        });

        transaction.remove(recipient);
    }
}
