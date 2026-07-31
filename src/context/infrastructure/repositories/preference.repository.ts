import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Preference } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { PreferenceAdapter } from "../adapters";

@Injectable({ scope: Scope.DEFAULT })
export class PreferenceRepository
    extends BaseRepository<Entities.Preference, Adapters.Preference.Types>({
        Adapter: PreferenceAdapter,
        Entity: Preference,
    })
    implements Repositories.Preference.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
