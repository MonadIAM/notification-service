import { Inject, Injectable, Scope } from "@nestjs/common";

import { ActionType, EntityType, ChannelType } from "~context/enums";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { RECIPIENT_SERVICE } from "~context/domain/services";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientCommands implements Commands.Recipient.Contract {
    private readonly dictionaryPath = "commands.recipient";
    private readonly resource = "Recipient";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(RECIPIENT_SERVICE)
        private readonly recipientService: Services.Recipient.CommandContract,
    ) {}

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

    public async update(props: Commands.Recipient.Update.Props): Commands.Recipient.Update.Result {
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.recipientService.update({
                    input: { patch: props.input, account: props.actor },
                    transaction,
                });
            },
        });

        return { message: `${this.dictionaryPath}.UPDATED` };
    }

    public async selectOtpChannel(
        props: Commands.Recipient.SelectOtpChannel.Props,
    ): Commands.Recipient.SelectOtpChannel.Result {
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.recipientService.selectOtpChannel({
                    input: { account: props.actor, channel: props.input.channel },
                    transaction,
                });
            },
        });

        return { message: `${this.dictionaryPath}.OTP_CHANNEL_SELECTED` };
    }

    public async confirm(props: Commands.Recipient.Confirm.Props): Commands.Recipient.Confirm.Result {
        const { incoming, input, context } = props;
        await this.transactionalService.consume({
            resource: this.resource,
            incoming,
            audit: { entityType: EntityType.RECIPIENT, actionType: ActionType.UPDATE, context, input },
            changeLog: true,
            execute: async (transaction) => {
                await this.recipientService.ensureChannel({
                    input: {
                        type: input.identifier.type === "email" ? ChannelType.EMAIL : ChannelType.SMS,
                        sourceIdentifier: input.identifier.id,
                        address: input.identifier.value,
                        account: input.account,
                        isVerified: true,
                    },
                    transaction,
                });
            },
        });
    }

    public async purge(props: Commands.Recipient.Purge.Props): Commands.Recipient.Purge.Result {
        const { input, incoming } = props;
        const operation: TransactionManager.Service.Run.Props<void> = {
            resource: this.resource,
            audit: {
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.DELETE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                await this.recipientService.purge({ input: { account: input.account }, transaction });
            },
        };

        if (incoming) {
            await this.transactionalService.consume({ ...operation, incoming });
        } else {
            await this.transactionalService.run(operation);
        }
    }
}
