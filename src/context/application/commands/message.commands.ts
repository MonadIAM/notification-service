import { Inject, Injectable, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { MESSAGE_REPOSITORY } from "~context/domain/repositories";
import { ActionType, EntityType } from "~context/enums";
import { Exception } from "~common/exceptions";

import { MESSAGE_SERVICE } from "../services";

@Injectable({ scope: Scope.DEFAULT })
export class MessageCommands implements Commands.Message.Contract {
    private readonly dictionaryPath = "commands.message";
    private readonly resource = "Message";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.Contract,
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
                const message = await this.messageRepository.findUniqueOrThrow({
                    options: { populate: ["notification", "notification.recipient"] },
                    where: { id: input.message },
                });

                if (message.notification.recipient.account !== actor) {
                    throw Exception.notFound({ messageKey: `${this.dictionaryPath}.NOT_FOUND` });
                }

                this.messageService.markRead({ input: { message }, transaction });
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
                const message = await this.messageRepository.findUniqueOrThrow({ where: { id: input.message } });

                this.messageService.markSent({ input: { message }, transaction });
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
                const message = await this.messageRepository.findUniqueOrThrow({ where: { id: input.message } });

                this.messageService.markDelivered({ input: { message }, transaction });
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
                const message = await this.messageRepository.findUniqueOrThrow({ where: { id: input.message } });

                this.messageService.markFailed({
                    input: { message, reason: input.reason, error: input.error },
                    transaction,
                });
            },
        });
    }
}
