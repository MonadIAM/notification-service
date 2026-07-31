import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Channel } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { ChannelAdapter } from "../adapters";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelRepository
    extends BaseRepository<Entities.Channel, Adapters.Channel.Types>({
        Adapter: ChannelAdapter,
        Entity: Channel,
    })
    implements Repositories.Channel.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
