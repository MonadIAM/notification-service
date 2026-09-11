import { ChangeSetType, Collection } from "@mikro-orm/core";
import { jest } from "@jest/globals";

import { Notification, Preference, Recipient, Channel, Message } from "~context/domain/entities";
import { AuditLog, ChangeLog } from "~common/transaction-manager/entities";
import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";

export class DomainServiceCoreUnitHelpers implements Unit.Domain.Core.Contract {
    public transaction(): Unit.Domain.Core.Transaction {
        const flush = jest.fn(() => Promise.resolve());
        const persist = jest.fn();
        const remove = jest.fn();
        const clear = jest.fn();
        const merge = jest.fn();

        return {
            entityManager: this.contract<ORM.EntityManager>({ persist, remove, flush, clear, merge }),
            persist,
            remove,
            flush,
            clear,
            merge,
        };
    }

    public collection<T extends object>(props: Unit.Domain.Core.CollectionFactory.Props<T>): Collection<T> {
        return new Collection<T>(props.owner, props.items);
    }

    public createRecipient(props: Unit.Domain.Core.CreateRecipient.Props = {}): Entities.Recipient {
        const entity = new Recipient({
            account: "00000000-0000-4000-8000-0000000000ff",
            timezone: "Europe/Moscow",
            locale: "ru",
        });

        Object.assign(entity, props);

        return entity;
    }

    public createChannel(props: Unit.Domain.Core.CreateChannel.Props = {}): Entities.Channel {
        const entity = new Channel({
            recipient: this.createRecipient(),
            type: ChannelType.IN_APP,
            isVerified: true,
        });

        Object.assign(entity, props);

        return entity;
    }

    public createPreference(props: Unit.Domain.Core.CreatePreference.Props = {}): Entities.Preference {
        const entity = new Preference({
            category: NotificationCategory.INVITES,
            recipient: this.createRecipient(),
            channelType: ChannelType.EMAIL,
            isDuplicationEnabled: false,
        });

        Object.assign(entity, props);

        return entity;
    }

    public createNotification(props: Unit.Domain.Core.CreateNotification.Props = {}): Entities.Notification {
        const entity = new Notification({
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SYSTEM,
            recipient: this.createRecipient(),
            template: "unit.template",
            title: "Unit Title",
            body: "Unit Body",
        });

        Object.assign(entity, props);

        return entity;
    }

    public createMessage(props: Unit.Domain.Core.CreateMessage.Props = {}): Entities.Message {
        const entity = new Message({
            notification: this.createNotification(),
            channelType: ChannelType.IN_APP,
            address: "unit@example.com",
        });

        Object.assign(entity, props);

        return entity;
    }

    public createAuditLog(props: Unit.Domain.Core.CreateAuditLog.Props = {}): SystemEntities.AuditLog {
        const entity = new AuditLog({
            context: { userAgent: "unit-agent", ip: "127.0.0.1" },
            entityType: "NOTIFICATION",
            actionType: "CREATE",
        });

        Object.assign(entity, props);

        return entity;
    }

    public createChangeLog(props: Unit.Domain.Core.CreateChangeLog.Props = {}): SystemEntities.ChangeLog {
        const entity = new ChangeLog({
            auditEntry: "00000000-0000-4000-8000-0000000000fe",
            entity: "00000000-0000-4000-8000-0000000000fd",
            changeType: ChangeSetType.CREATE,
            entityType: "NOTIFICATION",
            delta: {},
        });

        Object.assign(entity, props);

        return entity;
    }

    public services(): Unit.Domain.ServiceMocks.Contract {
        return {
            email: { send: jest.fn(() => Promise.resolve()) },
            sms: { send: jest.fn(() => Promise.resolve()) },
        };
    }

    public repositories(props: Unit.Domain.Core.Repositories.Props = {}): Unit.Domain.RepositoryMocks.Contract {
        const recipient = props.recipient ?? this.createRecipient();

        return {
            notifications: this.baseRepository("Notification"),
            preferences: {
                ...this.baseRepository("Preference"),
                findUnique: jest.fn(() => Promise.resolve(null)),
            },
            recipients: {
                ...this.baseRepository("Recipient"),
                findUniqueOrThrow: jest.fn(() => Promise.resolve(recipient)),
            },
            changeLogs: {
                ...this.baseRepository("ChangeLog"),
                find: jest.fn(() => Promise.resolve([])),
            },
            auditLogs: {
                ...this.baseRepository("AuditLog"),
                find: jest.fn(() => Promise.resolve([])),
            },
            channels: this.baseRepository("Channel"),
            messages: this.baseRepository("Message"),
        };
    }

    protected contract<T>(value: object): T {
        return value as T;
    }

    private baseRepository(resource: string): Unit.Domain.RepositoryMocks.Base {
        return {
            findUniqueOrThrow: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            find: jest.fn(),
            resource,
        };
    }
}
