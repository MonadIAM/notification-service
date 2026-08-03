import { Inject, Injectable, Scope } from "@nestjs/common";

import { MessageDispatchAction, MessageStatus, ChannelType, KafkaTopic } from "~context/enums";
import { NOTIFICATION_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/domain/repositories";
import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";

import { NOTIFICATION_SERVICE } from "../services";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationCommands implements Commands.Notification.Contract {
    private readonly resource = "Notification";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly notificationRepository: Repositories.Notification.Contract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(DISPATCH_DELAY_QUEUE)
        private readonly dispatchDelayQueue: Queues.DispatchDelay.Contract,
        @Inject(NOTIFICATION_SERVICE)
        private readonly notificationService: Services.Notification.Contract,
    ) {}

    public async create(props: Commands.Notification.Create.Props): Commands.Notification.Create.Result {
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
            where: { account: props.account },
        });

        await this.transactionalService.run<Entities.Message[]>({
            resource: this.resource,
            outbox: {
                payloadMapper: this.messageDispatchPayloadMapper.bind(this),
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                actionType: MessageDispatchAction.DISPATCH,
            },
            execute: (transaction) => {
                const { messages } = this.notificationService.create({
                    input: {
                        sourceService: props.sourceService,
                        dedupKey: props.dedupKey,
                        category: props.category,
                        template: props.template,
                        realm: props.realm,
                        title: props.title,
                        body: props.body,
                        recipient,
                    },
                    transaction,
                });

                return messages;
            },
        });
    }

    public async cancel(props: Commands.Notification.Cancel.Props): Commands.Notification.Cancel.Result {
        const notification = await this.notificationRepository.findUnique({
            options: { populate: ["messages"] },
            where: { dedupKey: props.dedupKey },
        });

        if (notification) {
            const toCancel: Entities.Message[] = [];
            const pending: Entities.Message[] = [];

            for (const message of notification.messages.getItems()) {
                if (message.channelType === ChannelType.IN_APP) {
                    toCancel.push(message);
                } else if (message.status === MessageStatus.QUEUED) {
                    pending.push(message);
                }
            }

            const cancelled = await Promise.all(pending.map(({ id }) => this.dispatchDelayQueue.cancel({ message: id })));

            if (cancelled.includes(false)) {
                return { alreadyDispatched: true };
            }

            toCancel.push(...pending);

            await this.transactionalService.run({
                resource: this.resource,
                execute: (transaction) => {
                    for (const message of toCancel) {
                        message.markCancelled();
                        transaction.merge(message);
                    }
                },
            });
        }

        return { alreadyDispatched: false };
    }

    public messageDispatchPayloadMapper(
        props: Commands.Notification.MessageDispatchPayloadMapper.Props,
    ): Commands.Notification.MessageDispatchPayloadMapper.Result {
        return props.filter(({ channelType }) => channelType !== ChannelType.IN_APP).map(({ id }) => ({ message: id }));
    }
}
