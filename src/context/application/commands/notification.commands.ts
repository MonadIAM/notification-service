import { Inject, Injectable, Scope } from "@nestjs/common";

import { MessageDispatchAction, MessageStatus, ChannelType, ActionType, EntityType, KafkaTopic } from "~context/enums";
import { NOTIFICATION_SERVICE, MESSAGE_SERVICE } from "~context/domain/services";
import { NOTIFICATION_REPOSITORY } from "~context/infrastructure/repositories";
import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";

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
        @Inject(DISPATCH_DELAY_QUEUE)
        private readonly dispatchDelayQueue: Queues.DispatchDelay.Contract,
        @Inject(NOTIFICATION_SERVICE)
        private readonly notificationService: Services.Notification.CommandContract,
        @Inject(MESSAGE_SERVICE)
        private readonly messageService: Services.Message.CommandContract,
    ) {
        this.mapper = new NotificationMapper();
    }

    public async create(props: Commands.Notification.Create.Props): Commands.Notification.Create.Result {
        const { incoming, context, actor, realm, input } = props;
        await this.transactionalService.consume({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.messageDispatchPayload,
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                actionType: MessageDispatchAction.DISPATCH,
            },
            audit: {
                entityType: EntityType.NOTIFICATION,
                actionType: ActionType.CREATE,
                context,
                actor,
                realm,
                input,
            },
            incoming,
            execute: async (transaction) => {
                const { messages } = await this.notificationService.create({
                    input: {
                        sourceService: input.sourceService,
                        dedupKey: input.dedupKey,
                        category: input.category,
                        template: input.template,
                        account: input.account,
                        realm: input.realm,
                        title: input.title,
                        body: input.body,
                    },
                    transaction,
                });

                return { messages };
            },
        });
    }

    public async cancel(props: Commands.Notification.Cancel.Props): Commands.Notification.Cancel.Result {
        const { incoming, context, actor, realm, input } = props;

        await this.transactionalService.consume({
            resource: this.resource,
            outbox: {
                payloadMapper: this.mapper.messageDispatchPayload,
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                actionType: MessageDispatchAction.DISPATCH,
            },
            audit: {
                entityType: EntityType.MESSAGE,
                actionType: ActionType.UPDATE,
                context,
                actor,
                realm,
                input,
            },
            incoming,
            execute: async (transaction) => {
                const notification = await this.notificationRepository.findUnique({
                    options: { populate: ["messages"] },
                    where: { dedupKey: input.dedupKey },
                    transaction,
                });
                const messages: Entities.Message[] = [];

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

                    const cancelled = await Promise.all(
                        pending.map(({ id }) => this.dispatchDelayQueue.cancel({ message: id })),
                    );

                    if (cancelled.includes(false)) {
                        const override = await this.notificationService.create({ input: input.override, transaction });
                        messages.push(...override.messages);
                    } else {
                        toCancel.push(...pending);
                        if (toCancel.length) {
                            this.messageService.markCancelled({ input: { messages: toCancel }, transaction });
                        }
                    }
                }

                return { messages };
            },
        });
    }
}
