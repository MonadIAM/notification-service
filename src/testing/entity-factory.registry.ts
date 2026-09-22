import { ChangeSetType, Collection } from "@mikro-orm/postgresql";

import { Notification, Preference, Recipient, Channel, Message } from "~context/domain/entities";
import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";
import { AuditLog, ChangeLog } from "~common/transaction-manager/entities";

export class EntityFactoryRegistry implements Testing.EntityFactory.Contract {
    public collection<T extends object>(props: Testing.EntityFactory.CollectionFactory.Props<T>): Collection<T> {
        return new Collection<T>(props.owner, props.items);
    }

    public createRecipient(props: Testing.EntityFactory.CreateRecipient.Props = {}): Entities.Recipient {
        return this.entity(
            new Recipient({
                ...props,
                account: props.account ?? "00000000-0000-4000-8000-0000000000ff",
                timezone: props.timezone ?? "Europe/Moscow",
                locale: props.locale ?? "ru",
            }),
            props,
        );
    }

    public createChannel(props: Testing.EntityFactory.CreateChannel.Props = {}): Entities.Channel {
        return this.entity(
            new Channel({
                ...props,
                recipient: props.recipient ?? this.createRecipient(),
                type: props.type ?? ChannelType.IN_APP,
                isVerified: props.isVerified ?? true,
            }),
            props,
        );
    }

    public createPreference(props: Testing.EntityFactory.CreatePreference.Props = {}): Entities.Preference {
        return this.entity(
            new Preference({
                ...props,
                category: props.category ?? NotificationCategory.INVITES,
                recipient: props.recipient ?? this.createRecipient(),
                channelType: props.channelType ?? ChannelType.EMAIL,
                isDuplicationEnabled: props.isDuplicationEnabled ?? false,
            }),
            props,
        );
    }

    public createNotification(props: Testing.EntityFactory.CreateNotification.Props = {}): Entities.Notification {
        return this.entity(
            new Notification({
                ...props,
                sourceService: props.sourceService ?? PlatformService.IDENTITY_SERVICE,
                category: props.category ?? NotificationCategory.SYSTEM,
                recipient: props.recipient ?? this.createRecipient(),
                template: props.template ?? "unit.template",
                title: props.title ?? "Unit Title",
                body: props.body ?? "Unit Body",
            }),
            props,
        );
    }

    public createMessage(props: Testing.EntityFactory.CreateMessage.Props = {}): Entities.Message {
        return this.entity(
            new Message({
                ...props,
                notification: props.notification ?? this.createNotification(),
                channelType: props.channelType ?? ChannelType.IN_APP,
                address: props.address ?? "unit@example.com",
            }),
            props,
        );
    }

    public createAuditLog(props: Testing.EntityFactory.CreateAuditLog.Props = {}): SystemEntities.AuditLog {
        const { context, ...state } = props;

        return this.entity(
            new AuditLog({
                ...state,
                context: { userAgent: context?.userAgent ?? "unit-agent", ip: context?.ip ?? "127.0.0.1" },
                entityType: props.entityType ?? "NOTIFICATION",
                actionType: props.actionType ?? "CREATE",
            }),
            state,
        );
    }

    public createChangeLog(props: Testing.EntityFactory.CreateChangeLog.Props = {}): SystemEntities.ChangeLog {
        return this.entity(
            new ChangeLog({
                ...props,
                auditEntry: props.auditEntry ?? "00000000-0000-4000-8000-0000000000fe",
                entity: props.entity ?? "00000000-0000-4000-8000-0000000000fd",
                changeType: props.changeType ?? ChangeSetType.CREATE,
                entityType: props.entityType ?? "NOTIFICATION",
                delta: props.delta ?? {},
            }),
            props,
        );
    }

    private entity<Entity extends object>(entity: Entity, props: Partial<Entity>): Entity {
        Object.assign(entity, props);
        return entity;
    }
}
