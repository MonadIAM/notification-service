import { Inject, Injectable, Scope } from "@nestjs/common";

import { PREFERENCE_REPOSITORY } from "~context/domain/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceQueries implements Queries.Preference.Contract {
    public constructor(
        @Inject(PREFERENCE_REPOSITORY)
        private readonly preferenceRepository: Repositories.Preference.QueryContract,
    ) {}

    public findMany(props: Queries.Preference.FindMany.Props): Queries.Preference.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.Preference> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.recipient = { account: props.actor };
        }

        return this.preferenceRepository.findMany({
            prefilter,
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
        });
    }
}
