import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";

export class DomainServiceCoreUnitHelpers extends EntityFactoryRegistry implements Unit.Domain.Core.Contract {
    public transaction(): Unit.Domain.Core.Transaction {
        const flush = jest.fn(() => Promise.resolve());
        const persist = jest.fn<(entity: object) => void>();
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

    public config(props: Unit.Domain.Core.Config.Props = {}): ConfigService {
        return this.contract<ConfigService>({
            getOrThrow: jest.fn((key: string) => props.values?.[key]),
        });
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
