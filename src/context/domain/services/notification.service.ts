import { Inject, Injectable, Scope } from "@nestjs/common";

import { RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { NotificationCategory, ChannelType } from "~context/enums";
import { DUPLICATABLE_CHANNEL_TYPES } from "~context/constants";

import { Notification, Message } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationService implements Services.Notification.Contract {
    public constructor(
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
    ) {}

    public async create(props: Services.Notification.Create.Props): Services.Notification.Create.Result {
        const { transaction, input } = props;
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
            where: { account: input.account },
            transaction,
        });

        const notification = new Notification({
            sourceService: input.sourceService,
            dedupKey: input.dedupKey,
            category: input.category,
            template: input.template,
            realm: input.realm,
            title: input.title,
            body: input.body,
            recipient,
        });

        transaction.persist(notification);

        const channelTypes = this.resolveChannelTypes({ recipient, category: input.category });
        const channels = recipient.channels.getItems();
        const messages: Entities.Message[] = [];

        for (const channelType of channelTypes) {
            const channel = channels.find((item) => item.type === channelType);

            if (channel) {
                const message = new Message({
                    address: channel.address ?? recipient.account,
                    notification,
                    channelType,
                    channel,
                });

                if (channelType === ChannelType.IN_APP) {
                    message.markSent();
                    message.markDelivered();
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
