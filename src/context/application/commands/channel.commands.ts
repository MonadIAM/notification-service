import { Inject, Injectable, Scope } from "@nestjs/common";

import { CHANNEL_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/domain/repositories";
import { ActionType, EntityType, ChannelType } from "~context/enums";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { Exception } from "~common/exceptions";

import { RECIPIENT_SERVICE, CHANNEL_SERVICE } from "../services";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelCommands implements Commands.Channel.Contract {
    private readonly dictionaryPath = "commands.channel";
    private readonly resource = "Channel";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.Contract,
        @Inject(RECIPIENT_SERVICE)
        private readonly recipientService: Services.Recipient.CommandContract,
        @Inject(CHANNEL_SERVICE)
        private readonly channelService: Services.Channel.CommandContract,
    ) {}

    public async toggleSound(props: Commands.Channel.ToggleSound.Props): Commands.Channel.ToggleSound.Result {
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["channels"] },
            where: { account: props.actor },
        });

        const channel = recipient.channels.getItems().find((item) => item.type === ChannelType.IN_APP);

        if (!channel) {
            throw Exception.notFound({ messageKey: `${this.dictionaryPath}.IN_APP_CHANNEL_NOT_FOUND` });
        }

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.CHANNEL,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                this.channelService.toggleSound({ input: { channel }, transaction });
                return channel;
            },
        });

        return { message: `${this.dictionaryPath}.SOUND_TOGGLED` };
    }

    public async create(props: Commands.Channel.Create.Props): Commands.Channel.Create.Result {
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: props.account },
        });

        await this.transactionalService.run({
            resource: this.resource,
            execute: (transaction) => {
                this.channelService.create({
                    input: {
                        sourceIdentifier: props.sourceIdentifier,
                        address: props.address,
                        type: props.type,
                        recipient,
                    },
                    transaction,
                });
            },
        });
    }

    public async markVerified(props: Commands.Channel.MarkVerified.Props): Commands.Channel.MarkVerified.Result {
        const channel = await this.channelRepository.findUniqueOrThrow({
            where: { sourceIdentifier: props.sourceIdentifier },
        });

        await this.transactionalService.run({
            resource: this.resource,
            execute: (transaction) => {
                this.channelService.markVerified({ input: { channel }, transaction });
            },
        });
    }

    public async purge(props: Commands.Channel.Purge.Props): Commands.Channel.Purge.Result {
        const channel = await this.channelRepository.findUniqueOrThrow({
            options: { populate: ["recipient", "recipient.defaultOtpChannel"] },
            where: { sourceIdentifier: props.sourceIdentifier },
        });

        await this.transactionalService.run({
            resource: this.resource,
            execute: (transaction) => {
                if (channel.recipient.defaultOtpChannel?.id === channel.id) {
                    this.recipientService.clearOtpChannel({ input: { recipient: channel.recipient }, transaction });
                }

                this.channelService.purge({ input: { channels: [channel] }, transaction });
            },
        });
    }
}
