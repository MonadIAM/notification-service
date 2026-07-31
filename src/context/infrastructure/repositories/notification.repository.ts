import { InjectEntityManager } from "@mikro-orm/nestjs";
import { Injectable, Scope } from "@nestjs/common";

import { Notification } from "~context/domain/entities";
import { BaseRepository } from "~common/mixins";

import { NotificationAdapter } from "../adapters";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationRepository
    extends BaseRepository<Entities.Notification, Adapters.Notification.Types>({
        Adapter: NotificationAdapter,
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
