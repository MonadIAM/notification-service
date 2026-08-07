import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Recipient } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { RecipientMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientRepository
    extends BaseRepository<Entities.Recipient, Repositories.Mappers.Recipient.Types>({
        Mapper: RecipientMapper,
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
