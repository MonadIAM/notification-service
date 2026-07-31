import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Recipient } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { RecipientAdapter } from "../adapters";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientRepository
    extends BaseRepository<Entities.Recipient, Adapters.Recipient.Types>({
        Adapter: RecipientAdapter,
        Entity: Recipient,
    })
    implements Repositories.Recipient.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
