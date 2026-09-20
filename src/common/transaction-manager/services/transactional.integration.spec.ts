import { describe, expect, it, jest } from "@jest/globals";
import { MessageDispatchAction } from "@monadiam/shared";
import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { TransactionalHelper } from "~testing/integration/transaction-manager/transactional.helpers";
import { ActionType, ChannelType, EntityType, KafkaTopic } from "~context/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { postgresSuite } from "~testing/integration/postgres.suite";
import { Channel, Recipient } from "~context/domain/entities";

import { AuditLog, ChangeLog, Inbox, Outbox } from "../entities";

describe("TransactionalService integration", () => {
    const helper = new TransactionalHelper();
    const suite = postgresSuite({
        repository: ({ orm }) => helper.createTransactionalServiceContext({ orm }),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    const MESSAGE_DISPATCH_OUTBOX_CONFIG = {
        payloadMapper: (recipient) => ({ message: recipient.id }),
        actionType: MessageDispatchAction.DISPATCH,
        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
    } satisfies TransactionManager.Service.OutboxConfig<Entities.Recipient>;

    const AUDIT_PROPS = {
        context: { ip: "127.0.0.1", userAgent: "transactional-integration" },
        entityType: EntityType.RECIPIENT,
        actionType: ActionType.CREATE,
        actor: randomUUID(),
        realm: randomUUID(),
    };

    const INCOMING_MESSAGE = {
        source: { topic: "source-topic", partition: 0, offset: "42" },
        event: "00000000-0000-4000-8000-000000000001",
        consumerKey: "notification.notification.v1",
    };

    it("commits inbox and effects exactly once", async () => {
        const executeDuplicate = jest.fn(() => Promise.reject(new Error("duplicate callback must not execute")));

        const first = await suite.repository().service.consume({
            incoming: INCOMING_MESSAGE,
            audit: AUDIT_PROPS,
            execute: () => Promise.resolve(),
        });
        const duplicate = await suite.repository().service.consume({
            incoming: INCOMING_MESSAGE,
            audit: AUDIT_PROPS,
            execute: executeDuplicate,
        });

        const readManager = suite.repository().readManager;
        readManager.clear();

        expect(first).toEqual({ status: "processed", value: undefined });
        expect(duplicate).toEqual({ status: "duplicate" });
        expect(executeDuplicate).not.toHaveBeenCalled();
        await expect(readManager.count(Inbox, {})).resolves.toBe(1);
        await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
    });

    it("rolls back a failed claim and allows redelivery", async () => {
        const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000002" };
        const failure = new Error("domain failed");

        await expect(
            suite.repository().service.consume({
                incoming,
                execute: () => Promise.reject(failure),
            }),
        ).rejects.toBe(failure);

        const readManager = suite.repository().readManager;
        readManager.clear();
        await expect(readManager.count(Inbox, {})).resolves.toBe(0);

        await expect(suite.repository().service.consume({ incoming, execute: () => Promise.resolve() })).resolves.toEqual({
            status: "processed",
            value: undefined,
        });

        readManager.clear();
        await expect(readManager.count(Inbox, {})).resolves.toBe(1);
    });

    it("allows only one concurrent transaction to process an event", async () => {
        const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000003" };
        const execute = jest.fn(() => Promise.resolve());
        const consume = (): TransactionManager.Service.Consume.Result<void> =>
            suite.repository().service.consume({ incoming, execute });

        const outcomes = await Promise.all([consume(), consume()]);
        const readManager = suite.repository().readManager;
        readManager.clear();

        expect(outcomes.map(({ status }) => status).sort()).toEqual(["duplicate", "processed"]);
        expect(execute).toHaveBeenCalledTimes(1);
        await expect(readManager.count(Inbox, {})).resolves.toBe(1);
    });

    it("commits audit log, change log, archive outbox and domain outbox in one trace", async () => {
        const result = await suite.repository().service.run({
            audit: { ...AUDIT_PROPS, input: { password: "secret-value" } },
            outbox: MESSAGE_DISPATCH_OUTBOX_CONFIG,
            changeLog: true,
            execute: (transaction) => {
                const recipient = new Recipient({
                    account: randomUUID(),
                    timezone: "UTC",
                    locale: "en-US",
                });
                const channel = new Channel({
                    address: "trace@example.test",
                    type: ChannelType.EMAIL,
                    recipient,
                });

                transaction.persist(recipient);
                transaction.persist(channel);

                return recipient;
            },
        });

        const readManager = suite.repository().readManager;
        readManager.clear();
        const auditLogs = await readManager.find(AuditLog, {});
        const changeLogs = await readManager.find(ChangeLog, {}, { orderBy: { entityType: "ASC" } });

        expect(result).toBeInstanceOf(Recipient);
        expect(await readManager.count(Recipient, { id: result?.id })).toBe(1);
        expect(await readManager.count(Channel, { address: "trace@example.test" })).toBe(1);
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toEqual(
            expect.objectContaining({
                signature: expect.stringContaining("signed:AuditLog:"),
                input: { password: "masked:secret-value" },
                keyVersion: 7,
            }),
        );
        expect(changeLogs).toHaveLength(2);
        expect(changeLogs.map((change) => change.auditEntry)).toEqual([auditLogs[0]!.id, auditLogs[0]!.id]);
        expect(changeLogs.map((change) => change.changeType)).toEqual([ChangeSetType.CREATE, ChangeSetType.CREATE]);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.CHANGE_LOG_ARCHIVE })).resolves.toBe(2);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH })).resolves.toBe(1);
    });

    it("commits domain outbox without audit context", async () => {
        const recipient = await suite.repository().service.run({
            outbox: MESSAGE_DISPATCH_OUTBOX_CONFIG,
            execute: (transaction) => {
                const entity = new Recipient({
                    account: randomUUID(),
                    timezone: "UTC",
                    locale: "en-US",
                });

                transaction.persist(entity);

                return entity;
            },
        });

        const readManager = suite.repository().readManager;
        readManager.clear();

        await expect(readManager.count(Recipient, { id: recipient?.id })).resolves.toBe(1);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH })).resolves.toBe(1);
        await expect(readManager.count(AuditLog, {})).resolves.toBe(0);
        await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
    });

    it("emits audit log, audit archive and outbox without change log", async () => {
        await suite.repository().service.emit({
            audit: { ...AUDIT_PROPS, input: { password: "rejected-secret" } },
            payload: { message: randomUUID() },
            actionType: MessageDispatchAction.DISPATCH,
            destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
        });

        const readManager = suite.repository().readManager;
        readManager.clear();
        const auditLogs = await readManager.find(AuditLog, {});

        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toEqual(
            expect.objectContaining({
                signature: expect.stringContaining("signed:AuditLog:"),
                input: { password: "masked:rejected-secret" },
                keyVersion: 7,
            }),
        );
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE })).resolves.toBe(1);
        await expect(readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH })).resolves.toBe(1);
        await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
    });

    it("rolls back domain rows, audit log, change log and outbox after a flushed domain write fails", async () => {
        const rollbackError = new Error("rollback after flush");

        await expect(
            suite.repository().service.run({
                audit: AUDIT_PROPS,
                changeLog: true,
                outbox: MESSAGE_DISPATCH_OUTBOX_CONFIG,
                execute: async (transaction) => {
                    const recipient = new Recipient({
                        account: randomUUID(),
                        timezone: "UTC",
                        locale: "en-US",
                    });

                    transaction.persist(recipient);
                    await transaction.flush();

                    throw rollbackError;
                },
            }),
        ).rejects.toBe(rollbackError);

        await helper.expectNoTransactionRows(suite.repository().readManager);
    });

    it("rolls back audit and domain rows when domain outbox building fails", async () => {
        const externalError = new Error("schema registry unavailable");
        const outboxService = helper.createOutboxService({
            build: () => {
                throw externalError;
            },
        });
        const service = helper.createTransactionalServiceContext({
            logMaskingService: helper.createLogMaskingService(),
            orm: suite.repository().orm,
            outboxService,
        }).service;

        await expect(
            service.run({
                audit: AUDIT_PROPS,
                changeLog: true,
                outbox: MESSAGE_DISPATCH_OUTBOX_CONFIG,
                execute: (transaction) => {
                    const recipient = new Recipient({
                        account: randomUUID(),
                        timezone: "UTC",
                        locale: "en-US",
                    });

                    transaction.persist(recipient);

                    return recipient;
                },
            }),
        ).rejects.toBe(externalError);

        await helper.expectNoTransactionRows(suite.repository().readManager);
    });

    it("does not execute domain code when audit signing fails", async () => {
        const externalError = new Error("vault signing unavailable");
        const execute = jest.fn<(transaction: ORM.EntityManager) => void>();
        const logMaskingService = helper.createLogMaskingService({
            sign: () => Promise.reject(externalError),
        });
        const service = helper.createTransactionalServiceContext({
            orm: suite.repository().orm,
            logMaskingService,
        }).service;

        await expect(
            service.run({
                audit: AUDIT_PROPS,
                changeLog: true,
                execute,
            }),
        ).rejects.toBe(externalError);

        expect(execute).not.toHaveBeenCalled();
        await helper.expectNoTransactionRows(suite.repository().readManager);
    });

    it("persists several real subscriber change logs in one audit transaction", async () => {
        const first = await suite.fixtures().createRecipient();
        const second = await suite.fixtures().createRecipient();

        await suite.repository().service.run({
            audit: { ...AUDIT_PROPS, actionType: ActionType.UPDATE },
            changeLog: true,
            execute: async (transaction) => {
                const firstRecipient = await transaction.findOneOrFail(Recipient, { id: first.id });
                const secondRecipient = await transaction.findOneOrFail(Recipient, { id: second.id });

                firstRecipient.update({ patch: { timezone: "Europe/Moscow" } });
                secondRecipient.update({ patch: { timezone: "Europe/Moscow" } });
            },
        });

        const readManager = suite.repository().readManager;
        readManager.clear();
        const auditLogs = await readManager.find(AuditLog, {});
        const changeLogs = await readManager.find(ChangeLog, {}, { orderBy: { entity: "ASC" } });

        expect(auditLogs).toHaveLength(1);
        expect(changeLogs).toHaveLength(2);
        expect(changeLogs.map((change) => change.auditEntry)).toEqual([auditLogs[0]!.id, auditLogs[0]!.id]);
        expect(changeLogs.map((change) => change.changeType)).toEqual([ChangeSetType.UPDATE, ChangeSetType.UPDATE]);
        expect(changeLogs.map((change) => change.delta.timezone)).toEqual(
            expect.arrayContaining([
                { old: "UTC", new: "Europe/Moscow" },
                { old: "UTC", new: "Europe/Moscow" },
            ]),
        );
    });

    it("rolls back and preserves external dependency errors raised during flush", async () => {
        const externalError = new Error("vault unavailable");
        const logMaskingService = helper.createLogMaskingService({
            maskChangeLog: () => Promise.reject(externalError),
        });
        const service = helper.createTransactionalServiceContext({
            orm: suite.repository().orm,
            logMaskingService,
        }).service;

        await expect(
            service.run({
                audit: AUDIT_PROPS,
                changeLog: true,
                execute: (transaction) => {
                    const recipient = new Recipient({
                        account: randomUUID(),
                        timezone: "UTC",
                        locale: "en-US",
                    });

                    transaction.persist(recipient);
                },
            }),
        ).rejects.toBe(externalError);

        await helper.expectNoTransactionRows(suite.repository().readManager);
    });

    describe("consume with payload", () => {
        const props = {
            incoming: INCOMING_MESSAGE,
            audit: { ...AUDIT_PROPS, input: { password: "payload-secret" } },
            payload: { message: "00000000-0000-4000-8000-000000000010" },
            actionType: MessageDispatchAction.DISPATCH,
            destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
        } satisfies TransactionManager.Service.Consume.PayloadProps;

        it("commits the inbox, masked audit and payload exactly once", async () => {
            const { service, readManager } = suite.repository();

            const first = await service.consume(props);
            const duplicate = await service.consume(props);

            readManager.clear();
            expect(first).toEqual({ status: "processed", value: undefined });
            expect(duplicate).toEqual({ status: "duplicate" });
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            const audit = await readManager.findOneOrFail(AuditLog, { actor: AUDIT_PROPS.actor });
            const event = await readManager.findOneOrFail(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH });
            expect(audit.input).toEqual({ password: "masked:payload-secret" });
            expect(event.payload).toEqual(props.payload);
        });

        it("deduplicates concurrent payload deliveries", async () => {
            const { service, readManager } = suite.repository();

            const outcomes = await Promise.all([service.consume(props), service.consume(props)]);

            readManager.clear();
            expect(outcomes.map(({ status }) => status).sort()).toEqual(["duplicate", "processed"]);
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
        });

        it.each(["outbox", "audit"] as const)("rolls back a failed %s and permits payload redelivery", async (stage) => {
            const error = new Error("payload effects failed");
            const outboxService = helper.createOutboxService(
                stage === "outbox"
                    ? {
                          buildAuditLogArchive: () => {
                              throw error;
                          },
                      }
                    : {},
            );
            const logMaskingService = helper.createLogMaskingService(
                stage === "audit"
                    ? {
                          sign: () => Promise.reject(error),
                      }
                    : {},
            );
            const { readManager, service } = suite.repository();
            const failing = helper.createTransactionalServiceContext({
                orm: suite.repository().orm,
                outboxService,
                logMaskingService,
            }).service;

            await expect(failing.consume(props)).rejects.toBe(error);

            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(0);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(0);
            await expect(readManager.count(Outbox, {})).resolves.toBe(0);
            await expect(readManager.count(ChangeLog, {})).resolves.toBe(0);

            await expect(service.consume(props)).resolves.toEqual({ status: "processed", value: undefined });

            readManager.clear();
            await expect(readManager.count(Inbox, {})).resolves.toBe(1);
            await expect(readManager.count(AuditLog, {})).resolves.toBe(1);
            await expect(readManager.count(Outbox, {})).resolves.toBe(2);
        });
    });
});
