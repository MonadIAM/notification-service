import { Injectable, Scope } from "@nestjs/common";

import { NotificationCategory, ChannelType } from "~context/enums";
import { DUPLICATABLE_CHANNEL_TYPES } from "~context/constants";

import { Notification, Message } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationService implements Services.Notification.Contract {
    public create(props: Services.Notification.Create.Props): Services.Notification.Create.Result {
        const { transaction, input } = props;
        const notification = new Notification({
            sourceService: input.sourceService,
            recipient: input.recipient,
            dedupKey: input.dedupKey,
            category: input.category,
            template: input.template,
            realm: input.realm,
            title: input.title,
            body: input.body,
        });

        transaction.persist(notification);

        const channelTypes = this.resolveChannelTypes({ recipient: input.recipient, category: input.category });
        const channels = input.recipient.channels.getItems();
        const messages: Entities.Message[] = [];

        for (const channelType of channelTypes) {
            const channel = channels.find((item) => item.type === channelType);

            if (channel) {
                const message = new Message({
                    address: channel.address ?? input.recipient.account,
                    notification,
                    channelType,
                    channel,
                });

                if (channelType === ChannelType.IN_APP) {
                    message.markSent();
                }

                transaction.persist(message);
                messages.push(message);
            }
        }

        return { notification, messages };
    }

    public resolveChannelTypes(
        props: Services.Notification.ResolveChannelTypes.Props,
    ): Services.Notification.ResolveChannelTypes.Result {
        const { recipient, category } = props;
        const types = new Set<ChannelType>([ChannelType.IN_APP]);

        if (category === NotificationCategory.SECURITY) {
            types.add(ChannelType.EMAIL);
        } else {
            const preferences = recipient.preferences.getItems();

            for (const channelType of DUPLICATABLE_CHANNEL_TYPES) {
                const preference = preferences.find(
                    (item) => item.channelType === channelType && item.category === category,
                );

                if (preference ? preference.isDuplicationEnabled : true) {
                    types.add(channelType);
                }
            }
        }

        return [...types];
    }
}
