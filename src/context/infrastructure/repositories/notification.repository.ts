import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Notification } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { NotificationMapper } from "../mappers";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationRepository
    extends BaseRepository<Entities.Notification, Repositories.Mappers.Notification.Types>({
        Mapper: NotificationMapper,
        Entity: Notification,
    })
    implements Repositories.Notification.Contract
{
    public constructor(
        @InjectEntityManager("read")
        protected readonly readManager: ORM.EntityManager,
    ) {
        super();
    }
}
