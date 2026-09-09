import { Inject, Injectable, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { CHANNEL_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelCommands implements Commands.Channel.Contract {
    private readonly dictionaryPath = "commands.channel";
    private readonly resource = "Channel";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(CHANNEL_SERVICE)
        private readonly channelService: Services.Channel.CommandContract,
    ) {}

    public async create(props: Commands.Channel.Create.Props): Commands.Channel.Create.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.CHANNEL,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.channelService.create({
                    input: {
                        sourceIdentifier: input.sourceIdentifier,
                        account: input.account,
                        address: input.address,
                        type: input.type,
                    },
                    transaction,
                });
            },
        });
    }

    public async toggleSound(props: Commands.Channel.ToggleSound.Props): Commands.Channel.ToggleSound.Result {
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.CHANNEL,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.channelService.toggleSound({ input: { account: props.actor }, transaction });
            },
        });

        return { message: `${this.dictionaryPath}.SOUND_TOGGLED` };
    }

    public async markVerified(props: Commands.Channel.MarkVerified.Props): Commands.Channel.MarkVerified.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.CHANNEL,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.channelService.markVerified({
                    input: { sourceIdentifier: input.sourceIdentifier },
                    transaction,
                });
            },
        });
    }

    public async purge(props: Commands.Channel.Purge.Props): Commands.Channel.Purge.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.CHANNEL,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.channelService.purge({ input: { sourceIdentifier: input.sourceIdentifier }, transaction });
            },
        });
    }
}
