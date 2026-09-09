import { Inject, Injectable, Scope } from "@nestjs/common";

import { DUPLICATABLE_CHANNEL_TYPES, CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { PREFERENCE_REPOSITORY, RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { Exception } from "~common/exceptions";

import { Preference } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceService implements Services.Preference.Contract {
    private readonly dictionaryPath = "services.preference";

    public constructor(
        @Inject(PREFERENCE_REPOSITORY)
        private readonly preferenceRepository: Repositories.Preference.Contract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
    ) {}

    public create(props: Services.Preference.Create.Props): Services.Preference.Create.Result {
        const { transaction, input } = props;
        const preference = new Preference({
            isDuplicationEnabled: input.isDuplicationEnabled,
            channelType: input.channelType,
            category: input.category,
            recipient: input.recipient,
        });

        transaction.persist(preference);

        return preference;
    }

    public async toggle(props: Services.Preference.Toggle.Props): Services.Preference.Toggle.Result {
        const { transaction, input } = props;
        if (!CONFIGURABLE_NOTIFICATION_CATEGORIES.includes(input.category)) {
            throw Exception.conflict({ messageKey: `${this.dictionaryPath}.CATEGORY_NOT_CONFIGURABLE` });
        } else if (!DUPLICATABLE_CHANNEL_TYPES.includes(input.channelType)) {
            throw Exception.conflict({ messageKey: `${this.dictionaryPath}.CHANNEL_NOT_CONFIGURABLE` });
        }

        const recipient = await this.recipientRepository.findUniqueOrThrow({
            where: { account: input.account },
            transaction,
        });

        const existing = await this.preferenceRepository.findUnique({
            where: {
                channelType: input.channelType,
                category: input.category,
                recipient: recipient.id,
            },
            transaction,
        });

        if (existing) {
            existing.toggle();
            return existing;
        } else {
            return this.create({
                input: {
                    channelType: input.channelType,
                    isDuplicationEnabled: false,
                    category: input.category,
                    recipient,
                },
                transaction,
            });
        }
    }
}
