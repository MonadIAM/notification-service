import { Inject, Injectable, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { PREFERENCE_SERVICE } from "~context/domain/services";
import { ActionType, EntityType } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceCommands implements Commands.Preference.Contract {
    private readonly dictionaryPath = "commands.preference";
    private readonly resource = "Preference";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(PREFERENCE_SERVICE)
        private readonly preferenceService: Services.Preference.CommandContract,
    ) {}

    public async toggle(props: Commands.Preference.Toggle.Props): Commands.Preference.Toggle.Result {
        await this.transactionalService.run({
            resource: this.resource,
            audit: {
                entityType: EntityType.PREFERENCE,
                actionType: ActionType.UPDATE,
                ...props,
            },
            changeLog: true,
            execute: async (transaction) => {
                return await this.preferenceService.toggle({
                    input: {
                        channelType: props.input.channelType,
                        category: props.input.category,
                        account: props.actor,
                    },
                    transaction,
                });
            },
        });

        return { message: `${this.dictionaryPath}.TOGGLED` };
    }
}
