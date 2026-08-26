import { Inject, Injectable, Scope } from "@nestjs/common";

import { DUPLICATABLE_CHANNEL_TYPES, CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { PREFERENCE_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { PREFERENCE_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";
import { Exception } from "~common/exceptions";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceCommands implements Commands.Preference.Contract {
    private readonly dictionaryPath = "commands.preference";
    private readonly resource = "Preference";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(PREFERENCE_REPOSITORY)
        private readonly preferenceRepository: Repositories.Preference.Contract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(PREFERENCE_SERVICE)
        private readonly preferenceService: Services.Preference.CommandContract,
    ) {}

    public async toggle(props: Commands.Preference.Toggle.Props): Commands.Preference.Toggle.Result {
        if (!CONFIGURABLE_NOTIFICATION_CATEGORIES.includes(props.input.category)) {
            throw Exception.conflict({ messageKey: `${this.dictionaryPath}.CATEGORY_NOT_CONFIGURABLE` });
        } else if (!DUPLICATABLE_CHANNEL_TYPES.includes(props.input.channelType)) {
            throw Exception.conflict({ messageKey: `${this.dictionaryPath}.CHANNEL_NOT_CONFIGURABLE` });
        }

        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: props.actor },
        });

        const existing = await this.preferenceRepository.findUnique({
            where: {
                channelType: props.input.channelType,
                category: props.input.category,
                recipient: recipient.id,
            },
        });

        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.PREFERENCE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: (transaction) => {
                if (existing) {
                    this.preferenceService.toggle({ input: { preference: existing }, transaction });
                    return existing;
                } else {
                    return this.preferenceService.create({
                        input: {
                            channelType: props.input.channelType,
                            category: props.input.category,
                            isDuplicationEnabled: false,
                            recipient,
                        },
                        transaction,
                    });
                }
            },
        });

        return { message: `${this.dictionaryPath}.TOGGLED` };
    }
}
