import { Inject, Injectable, Scope } from "@nestjs/common";

import { DUPLICATABLE_CHANNEL_TYPES, CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { CHANNEL_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";
import { ChannelType } from "~context/enums";

import { Preference, Channel } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelService implements Services.Channel.Contract {
    private readonly dictionaryPath = "services.channel";

    public constructor(
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.Contract,
    ) {}

    public async create(props: Services.Channel.Create.Props): Services.Channel.Create.Result {
        const { transaction, input } = props;
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: input.account },
            transaction,
        });

        const channel = new Channel({
            sourceIdentifier: input.sourceIdentifier,
            isVerified: input.isVerified,
            address: input.address,
            type: input.type,
            recipient,
        });

        transaction.persist(channel);

        if (DUPLICATABLE_CHANNEL_TYPES.includes(channel.type)) {
            for (const category of CONFIGURABLE_NOTIFICATION_CATEGORIES) {
                transaction.persist(
                    new Preference({
                        isDuplicationEnabled: false,
                        channelType: channel.type,
                        recipient,
                        category,
                    }),
                );
            }
        }

        return channel;
    }

    public async markVerified(props: Services.Channel.MarkVerified.Props): Services.Channel.MarkVerified.Result {
        const { transaction, input } = props;
        const channel = await this.channelRepository.findUniqueOrThrow({
            where: { sourceIdentifier: input.sourceIdentifier },
            transaction,
        });

        channel.markVerified();
    }

    public async toggleSound(props: Services.Channel.ToggleSound.Props): Services.Channel.ToggleSound.Result {
        const { transaction, input } = props;
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["channels"] },
            where: { account: input.account },
            transaction,
        });

        const channel = recipient.channels.getItems().find((item) => item.type === ChannelType.IN_APP);

        if (channel) {
            channel.toggleSound();
            return channel;
        } else {
            throw Exception.notFound({ messageKey: `${this.dictionaryPath}.IN_APP_CHANNEL_NOT_FOUND` });
        }
    }

    public async purge(props: Services.Channel.Purge.Props): Services.Channel.Purge.Result {
        const { transaction, input } = props;
        const channel = await this.channelRepository.findUniqueOrThrow({
            options: { populate: ["recipient", "recipient.defaultOtpChannel"] },
            where: { sourceIdentifier: input.sourceIdentifier },
            transaction,
        });

        if (channel.recipient.defaultOtpChannel?.id === channel.id) {
            channel.recipient.clearOtpChannel();
        } else {
            transaction.remove(channel);
        }
    }
}
