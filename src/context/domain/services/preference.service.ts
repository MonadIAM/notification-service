import { Injectable, Scope } from "@nestjs/common";

import { Preference } from "../entities";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceService implements Services.Preference.Contract {
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

    public toggle(props: Services.Preference.Toggle.Props): Services.Preference.Toggle.Result {
        const { transaction, input } = props;
        input.preference.toggle();
        transaction.merge(input.preference);
    }
}
