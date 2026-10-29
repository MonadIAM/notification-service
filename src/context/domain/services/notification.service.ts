import { Inject, Injectable, Scope } from "@nestjs/common";

import { NotificationCategory, ChannelType, MessageTemplate, PlatformService } from "~context/enums";
import { RECIPIENT_REPOSITORY, NOTIFICATION_REPOSITORY } from "~context/infrastructure/repositories";
import { DUPLICATABLE_CHANNEL_TYPES, OTP_MESSAGE_TEMPLATES } from "~context/constants";
import { Exception } from "~common/exceptions";

import { RECIPIENT_SERVICE, MESSAGE_SERVICE } from "./tokens";
import { Notification, Message } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationService implements Services.Notification.Contract {
    private readonly dictionaryPath = "services.notification";

    public constructor(
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(RECIPIENT_SERVICE)
        private readonly recipientService: Services.Recipient.CommandContract,
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly notificationRepository: Repositories.Notification.Contract,
        @Inject(MESSAGE_SERVICE)
        private readonly messageService: Services.Message.CommandContract,
    ) {}

    public async create(props: Services.Notification.Create.Props): Services.Notification.Create.Result {
        const { transaction, input } = props;

        if (input.template === MessageTemplate.IDENTIFIER_VERIFICATION_OTP && !input.delivery) {
            throw Exception.invariantViolation({ messageKey: `${this.dictionaryPath}.DELIVERY_REQUIRED` });
        }

        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: {
                populate: ["channels", "preferences", "defaultOtpChannel"],
            },
            where: { account: input.account },
            transaction,
        });

        const notification = new Notification({
            sourceService: input.sourceService,
            dedupKey: input.dedupKey,
            category: input.category,
            template: input.template,
            locale: input.locale,
            realm: input.realm,
            title: input.title,
            body: input.body,
            recipient,
        });

        transaction.persist(notification);

        const messages: Entities.Message[] = [];

        if (input.delivery) {
            const message = new Message({
                channelType: input.delivery.channelType,
                address: input.delivery.address,
                notification,
            });

            transaction.persist(message);
            messages.push(message);
        } else {
            const channelTypes = OTP_MESSAGE_TEMPLATES.includes(input.template)
                ? [ChannelType.EMAIL]
                : this.resolveChannelTypes({ recipient, category: input.category });
            const channels = recipient.channels.getItems();
            const selectedChannels = channelTypes.flatMap((type) => channels.filter((item) => item.type === type));

            for (const channel of selectedChannels) {
                const channelType = channel.type;
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

    public async register(props: Services.Notification.Register.Props): Services.Notification.Register.Result {
        const { transaction, input } = props;

        const { recipient, channel } = await this.recipientService.ensureChannel({
            input: {
                sourceIdentifier: input.sourceIdentifier,
                timezone: input.timezone,
                address: input.address,
                account: input.account,
                locale: input.locale,
                type: input.type,
            },
            transaction,
        });

        const notification = new Notification({
            template: MessageTemplate.ACCOUNT_VERIFICATION_OTP,
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SECURITY,
            locale: input.language,
            title: input.title,
            body: input.body,
            recipient,
        });

        const message = new Message({
            channelType: channel.type,
            address: input.address,
            notification,
            channel,
        });

        transaction.persist(notification);
        transaction.persist(message);

        return { notification, messages: [message] };
    }

    public async cancel(props: Services.Notification.Cancel.Props): Services.Notification.Cancel.Result {
        const { input, transaction } = props;
        const notification = await this.notificationRepository.findUnique({
            options: { populate: ["messages"] },
            where: { dedupKey: input.dedupKey },
            transaction,
        });
        const messages: Entities.Message[] = [];

        if (notification) {
            const cancelled = await this.messageService.cancelDispatch({
                input: { messages: notification.messages.getItems() },
                transaction,
            });
            if (!cancelled) {
                const override = await this.create({ input: input.override, transaction });
                messages.push(...override.messages);
            }
        }

        return { messages };
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
