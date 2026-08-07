import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Message } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { MessageMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class MessageRepository
    extends BaseRepository<Entities.Message, Repositories.Mappers.Message.Types>({
        Mapper: MessageMapper,
        Entity: Message,
    })
    implements Repositories.Message.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
