import { Inject, Injectable, Scope } from "@nestjs/common";

import { MessageDispatchAction, ChannelType, ActionType, EntityType, KafkaTopic } from "~context/enums";
import { NOTIFICATION_SERVICE } from "~context/domain/services";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";

import { NotificationMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationCommands implements Commands.Notification.Contract {
    private readonly mapper: Commands.Mappers.Notification.Contract;
    private readonly resource = "Notification";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(NOTIFICATION_SERVICE)
        private readonly notificationService: Services.Notification.CommandContract,
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

    public async register(props: Commands.Notification.Register.Props): Commands.Notification.Register.Result {
        const { incoming, context, input } = props;
        await this.transactionalService.consume({
            resource: this.resource,
            incoming,
            outbox: {
                payloadMapper: this.mapper.messageDispatchPayload,
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                actionType: MessageDispatchAction.DISPATCH,
            },
            audit: {
                entityType: EntityType.NOTIFICATION,
                actionType: ActionType.CREATE,
                context,
                input,
            },
            execute: async (transaction) => {
                const { messages } = await this.notificationService.register({
                    input: {
                        type: input.identifier.type === "email" ? ChannelType.EMAIL : ChannelType.SMS,
                        sourceIdentifier: input.identifier.id,
                        address: input.identifier.value,
                        account: input.account,
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
                const { messages } = await this.notificationService.cancel({ input, transaction });

                return { messages };
            },
        });
    }
}
