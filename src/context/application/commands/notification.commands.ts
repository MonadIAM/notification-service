import { Inject, Injectable, Scope } from "@nestjs/common";

import { MessageDispatchAction, MessageStatus, ChannelType, ActionType, EntityType, KafkaTopic } from "~context/enums";
import { NOTIFICATION_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { NOTIFICATION_SERVICE } from "~context/domain/services";

import { NotificationMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationCommands implements Commands.Notification.Contract {
    private readonly mapper: Commands.Mappers.Notification.Contract;
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
        private readonly notificationService: Services.Notification.CommandContract,
    ) {
        this.mapper = new NotificationMapper();
    }

    public async create(props: Commands.Notification.Create.Props): Commands.Notification.Create.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.messageDispatchPayload,
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                actionType: MessageDispatchAction.DISPATCH,
            },
            audit: {
                entityType: EntityType.NOTIFICATION,
                actionType: ActionType.CREATE,
                ...props,
            },
            execute: async (transaction) => {
                const recipient = await this.recipientRepository.findUniqueOrThrow({
                    options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
                    where: { account: input.account },
                });

                const { messages } = this.notificationService.create({
                    input: {
                        sourceService: input.sourceService,
                        dedupKey: input.dedupKey,
                        category: input.category,
                        template: input.template,
                        realm: input.realm,
                        title: input.title,
                        body: input.body,
                        recipient,
                    },
                    transaction,
                });

                return { messages };
            },
        });
    }

    public async cancel(props: Commands.Notification.Cancel.Props): Commands.Notification.Cancel.Result {
        const { input } = props;
        const notification = await this.notificationRepository.findUnique({
            options: { populate: ["messages"] },
            where: { dedupKey: input.dedupKey },
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

            if (toCancel.length) {
                await this.transactionalService.run({
                    resource: this.resource,
                    audit: {
                        entityType: EntityType.MESSAGE,
                        actionType: ActionType.UPDATE,
                        ...props,
                    },
                    execute: (transaction) => {
                        for (const message of toCancel) {
                            message.markCancelled();
                            transaction.merge(message);
                        }
                    },
                });
            }
        }

        return { alreadyDispatched: false };
    }
}
