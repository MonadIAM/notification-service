import { Collection } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { NotificationCategory, PlatformService } from "~context/enums";

export class Notification implements Entities.Notification.Contract {
    public id: string;
    public createdAt: Date;
    public version: number = 1;

    public category: NotificationCategory;
    public sourceService: PlatformService;
    public dedupKey?: string;
    public template: string;
    public realm?: string;
    public title?: string;
    public body?: string;

    public messages = new Collection<Entities.Message>(this);
    public recipient: Entities.Recipient;

    public constructor(props: Entities.Notification.ConstructorProps) {
        this.createdAt = new Date();
        this.id = randomUUID();

        this.category = props.category;
        this.sourceService = props.sourceService;
        this.realm = props.realm;
        this.dedupKey = props.dedupKey;
        this.template = props.template;
        this.title = props.title;
        this.body = props.body;

        this.recipient = props.recipient;
    }
}
