import { Inject, Injectable, Scope } from "@nestjs/common";

import { RECIPIENT_REPOSITORY, CHANNEL_REPOSITORY } from "~context/domain/repositories";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { ActionType, EntityType } from "~context/enums";

import { RECIPIENT_SERVICE } from "../services";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientCommands implements Commands.Recipient.Contract {
    private readonly dictionaryPath = "commands.recipient";
    private readonly resource = "Recipient";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.Contract,
        @Inject(RECIPIENT_SERVICE)
        private readonly recipientService: Services.Recipient.CommandContract,
    ) {}

    public async update(props: Commands.Recipient.Update.Props): Commands.Recipient.Update.Result {
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: props.actor },
        });

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                this.recipientService.update({ input: { recipient, patch: props.input }, transaction });
                return recipient;
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async selectOtpChannel(
        props: Commands.Recipient.SelectOtpChannel.Props,
    ): Commands.Recipient.SelectOtpChannel.Result {
        const [recipient, channel] = await Promise.all([
            this.recipientRepository.findUniqueOrThrow({ where: { account: props.actor } }),
            this.channelRepository.findUniqueOrThrow({
                options: { populate: ["recipient"] },
                where: { id: props.input.channel },
            }),
        ]);

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                this.recipientService.selectOtpChannel({ input: { recipient, channel }, transaction });
                return recipient;
            },
        });

        return { message: `${this.dictionaryPath}.OTP_CHANNEL_SELECTED` };
    }

    public async create(props: Commands.Recipient.Create.Props): Commands.Recipient.Create.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.CREATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                this.recipientService.create({
                    input: {
                        timezone: input.timezone,
                        account: input.account,
                        locale: input.locale,
                    },
                    transaction,
                });
            },
        });
    }

    public async purge(props: Commands.Recipient.Purge.Props): Commands.Recipient.Purge.Result {
        const { input } = props;
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                const recipient = await this.recipientRepository.findUniqueOrThrow({
                    where: { account: input.account },
                });

                this.recipientService.purge({ input: { recipient }, transaction });
            },
        });
    }
}
