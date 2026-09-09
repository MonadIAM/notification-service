import { Inject, Injectable, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { MESSAGE_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class MessageCommands implements Commands.Message.Contract {
    private readonly dictionaryPath = "commands.message";
    private readonly resource = "Message";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(MESSAGE_SERVICE)
        private readonly messageService: Services.Message.CommandContract,
    ) {}

    public async markRead(props: Commands.Message.MarkRead.Props): Commands.Message.MarkRead.Result {
        const { input, actor } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.MESSAGE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.messageService.markRead({ input: { message: input.message, actor }, transaction });
            },
        });

        return { message: `${this.dictionaryPath}.READ` };
    }

    public async markSent(props: Commands.Message.MarkSent.Props): Commands.Message.MarkSent.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.MESSAGE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.messageService.markSent({ input: { message: input.message }, transaction });
            },
        });
    }

    public async markDelivered(props: Commands.Message.MarkDelivered.Props): Commands.Message.MarkDelivered.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.MESSAGE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.messageService.markDelivered({ input: { message: input.message }, transaction });
            },
        });
    }

    public async markFailed(props: Commands.Message.MarkFailed.Props): Commands.Message.MarkFailed.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.MESSAGE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.messageService.markFailed({
                    input: { message: input.message, reason: input.reason, error: input.error },
                    transaction,
                });
            },
        });
    }
}
