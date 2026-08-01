import { Injectable, Scope } from "@nestjs/common";

import { DUPLICATABLE_CHANNEL_TYPES, CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";

import { Preference, Channel } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelService implements Services.Channel.Contract {
    public create(props: Services.Channel.Create.Props): Services.Channel.Create.Result {
        const { transaction, input } = props;
        const channel = new Channel({
            sourceIdentifier: input.sourceIdentifier,
            isVerified: input.isVerified,
            recipient: input.recipient,
            address: input.address,
            type: input.type,
        });

        transaction.persist(channel);

        if (DUPLICATABLE_CHANNEL_TYPES.includes(channel.type)) {
            for (const category of CONFIGURABLE_NOTIFICATION_CATEGORIES) {
                transaction.persist(
                    new Preference({
                        isDuplicationEnabled: false,
                        recipient: input.recipient,
                        channelType: channel.type,
                        category,
                    }),
                );
            }
        }

        return channel;
    }

    public markVerified(props: Services.Channel.MarkVerified.Props): Services.Channel.MarkVerified.Result {
        const { transaction, input } = props;
        input.channel.markVerified();
        transaction.merge(input.channel);
    }

    public toggleSound(props: Services.Channel.ToggleSound.Props): Services.Channel.ToggleSound.Result {
        const { transaction, input } = props;
        input.channel.toggleSound();
        transaction.merge(input.channel);
    }

    public purge(props: Services.Channel.Purge.Props): Services.Channel.Purge.Result {
        const { transaction, input } = props;
        for (const channel of input.channels) {
            transaction.remove(channel);
        }
    }
}
