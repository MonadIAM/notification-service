import { describe, expect, it, jest } from "@jest/globals";
import { MessageDispatchAction } from "@monadiam/shared";
import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { TransactionalHelper } from "~testing/integration/transaction-manager/transactional.helpers";
import { ActionType, ChannelType, EntityType, KafkaTopic } from "~context/enums";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { Channel, Recipient } from "~context/domain/entities";

import { AuditLog, ChangeLog, Inbox, Outbox } from "../entities";

describe("[CommonService] - Transactional", () => {
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

    describe("[Method] - consume", () => {
        it("[case] - commits inbox and effects exactly once", async () => {
            // Arrange
            const executeDuplicate = jest.fn(() => Promise.reject(new Error("duplicate callback must not execute")));

            // Act
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
            const result = await readManager.count(Inbox, {});
            const result1 = await readManager.count(AuditLog, {});
            const result2 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE });

            // Assert
            expect(first).toEqual({ status: "processed", value: undefined });
            expect(duplicate).toEqual({ status: "duplicate" });
            expect(executeDuplicate).not.toHaveBeenCalled();
            expect(result).toBe(1);
            expect(result1).toBe(1);
            expect(result2).toBe(1);
        });

        it("[case] - rolls back a failed claim and allows redelivery", async () => {
            // Arrange
            const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000002" };
            const failure = new Error("domain failed");

            // Act
            const result = suite.repository().service.consume({
                incoming,
                execute: () => Promise.reject(failure),
            });
            await Promise.allSettled([result]);
            const readManager = suite.repository().readManager;
            readManager.clear();
            const result1 = await readManager.count(Inbox, {});
            const result2 = await suite.repository().service.consume({ incoming, execute: () => Promise.resolve() });
            readManager.clear();
            const result3 = await readManager.count(Inbox, {});

            // Assert
            await expect(result).rejects.toBe(failure);
            expect(result1).toBe(0);
            expect(result2).toEqual({
                status: "processed",
                value: undefined,
            });
            expect(result3).toBe(1);
        });

        it("[case] - allows only one concurrent transaction to process an event", async () => {
            // Arrange
            const incoming = { ...INCOMING_MESSAGE, event: "00000000-0000-4000-8000-000000000003" };
            const execute = jest.fn(() => Promise.resolve());

            // Act
            const consume = (): TransactionManager.Service.Consume.Result<void> =>
                suite.repository().service.consume({ incoming, execute });
            const outcomes = await Promise.all([consume(), consume()]);
            const readManager = suite.repository().readManager;
            readManager.clear();
            const result = outcomes.map(({ status }) => status).sort();
            const result1 = await readManager.count(Inbox, {});

            // Assert
            expect(result).toEqual(["duplicate", "processed"]);
            expect(execute).toHaveBeenCalledTimes(1);
            expect(result1).toBe(1);
        });
    });

    describe("[Method] - run", () => {
        it("[case] - commits audit log, change log, archive outbox and domain outbox in one trace", async () => {
            // Arrange

            // Act
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
            const result1 = result;
            const result2 = await readManager.count(Recipient, { id: result?.id });
            const result3 = await readManager.count(Channel, { address: "trace@example.test" });
            const result4 = auditLogs;
            const result5 = auditLogs[0];
            const result6 = changeLogs;
            const result7 = changeLogs.map((change) => change.auditEntry);
            const result8 = changeLogs.map((change) => change.changeType);
            const result9 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE });
            const result10 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.CHANGE_LOG_ARCHIVE });
            const result11 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH });

            // Assert
            expect(result1).toBeInstanceOf(Recipient);
            expect(result2).toBe(1);
            expect(result3).toBe(1);
            expect(result4).toHaveLength(1);
            expect(result5).toEqual(
                expect.objectContaining({
                    signature: expect.stringContaining("signed:AuditLog:"),
                    input: { password: "masked:secret-value" },
                    keyVersion: 7,
                }),
            );
            expect(result6).toHaveLength(2);
            expect(result7).toEqual([auditLogs[0]!.id, auditLogs[0]!.id]);
            expect(result8).toEqual([ChangeSetType.CREATE, ChangeSetType.CREATE]);
            expect(result9).toBe(1);
            expect(result10).toBe(2);
            expect(result11).toBe(1);
        });

        it("[case] - commits domain outbox without audit context", async () => {
            // Arrange

            // Act
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
            const result = await readManager.count(Recipient, { id: recipient?.id });
            const result1 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH });
            const result2 = await readManager.count(AuditLog, {});
            const result3 = await readManager.count(ChangeLog, {});

            // Assert
            expect(result).toBe(1);
            expect(result1).toBe(1);
            expect(result2).toBe(0);
            expect(result3).toBe(0);
        });

        it("[case] - rolls back domain rows, audit log, change log and outbox after a flushed domain write fails", async () => {
            // Arrange
            const rollbackError = new Error("rollback after flush");

            // Act
            const result = suite.repository().service.run({
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
            });

            // Assert
            await expect(result).rejects.toBe(rollbackError);
            await helper.expectNoTransactionRows(suite.repository().readManager);
        });

        it("[case] - rolls back audit and domain rows when domain outbox building fails", async () => {
            // Arrange
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

            // Act
            const result = service.run({
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
            });

            // Assert
            await expect(result).rejects.toBe(externalError);
            await helper.expectNoTransactionRows(suite.repository().readManager);
        });

        it("[case] - does not execute domain code when audit signing fails", async () => {
            // Arrange
            const externalError = new Error("vault signing unavailable");
            const execute = jest.fn<(transaction: ORM.EntityManager) => void>();
            const logMaskingService = helper.createLogMaskingService({
                sign: () => Promise.reject(externalError),
            });
            const service = helper.createTransactionalServiceContext({
                orm: suite.repository().orm,
                logMaskingService,
            }).service;

            // Act
            const result = service.run({
                audit: AUDIT_PROPS,
                changeLog: true,
                execute,
            });

            // Assert
            await expect(result).rejects.toBe(externalError);
            expect(execute).not.toHaveBeenCalled();
            await helper.expectNoTransactionRows(suite.repository().readManager);
        });

        it("[case] - persists several real subscriber change logs in one audit transaction", async () => {
            // Arrange
            const first = await suite.fixtures().createRecipient();
            const second = await suite.fixtures().createRecipient();

            // Act
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
            const result = auditLogs;
            const result1 = changeLogs;
            const result2 = changeLogs.map((change) => change.auditEntry);
            const result3 = changeLogs.map((change) => change.changeType);
            const result4 = changeLogs.map((change) => change.delta.timezone);

            // Assert
            expect(result).toHaveLength(1);
            expect(result1).toHaveLength(2);
            expect(result2).toEqual([auditLogs[0]!.id, auditLogs[0]!.id]);
            expect(result3).toEqual([ChangeSetType.UPDATE, ChangeSetType.UPDATE]);
            expect(result4).toEqual(
                expect.arrayContaining([
                    { old: "UTC", new: "Europe/Moscow" },
                    { old: "UTC", new: "Europe/Moscow" },
                ]),
            );
        });

        it("[case] - rolls back and preserves external dependency errors raised during flush", async () => {
            // Arrange
            const externalError = new Error("vault unavailable");
            const logMaskingService = helper.createLogMaskingService({
                maskChangeLog: () => Promise.reject(externalError),
            });
            const service = helper.createTransactionalServiceContext({
                orm: suite.repository().orm,
                logMaskingService,
            }).service;

            // Act
            const result = service.run({
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
            });

            // Assert
            await expect(result).rejects.toBe(externalError);
            await helper.expectNoTransactionRows(suite.repository().readManager);
        });
    });

    describe("[Method] - emit", () => {
        it("[case] - emits audit log, audit archive and outbox without change log", async () => {
            // Arrange

            // Act
            await suite.repository().service.emit({
                audit: { ...AUDIT_PROPS, input: { password: "rejected-secret" } },
                payload: { message: randomUUID() },
                actionType: MessageDispatchAction.DISPATCH,
                destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
            });
            const readManager = suite.repository().readManager;
            readManager.clear();
            const auditLogs = await readManager.find(AuditLog, {});
            const result = auditLogs;
            const result1 = auditLogs[0];
            const result2 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.AUDIT_LOG_ARCHIVE });
            const result3 = await readManager.count(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH });
            const result4 = await readManager.count(ChangeLog, {});

            // Assert
            expect(result).toHaveLength(1);
            expect(result1).toEqual(
                expect.objectContaining({
                    signature: expect.stringContaining("signed:AuditLog:"),
                    input: { password: "masked:rejected-secret" },
                    keyVersion: 7,
                }),
            );
            expect(result2).toBe(1);
            expect(result3).toBe(1);
            expect(result4).toBe(0);
        });
    });

    describe("[Behavior] - consume with payload", () => {
        const props = {
            incoming: INCOMING_MESSAGE,
            audit: { ...AUDIT_PROPS, input: { password: "payload-secret" } },
            payload: { message: "00000000-0000-4000-8000-000000000010" },
            actionType: MessageDispatchAction.DISPATCH,
            destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
        } satisfies TransactionManager.Service.Consume.PayloadProps;

        it("[case] - commits the inbox, masked audit and payload exactly once", async () => {
            // Arrange
            const { service, readManager } = suite.repository();

            // Act
            const first = await service.consume(props);
            const duplicate = await service.consume(props);
            readManager.clear();
            const result = first;
            const result1 = duplicate;
            const result2 = await readManager.count(Inbox, {});
            const result3 = await readManager.count(ChangeLog, {});
            const result4 = await readManager.count(Outbox, {});
            const result5 = await readManager.count(AuditLog, {});
            const audit = await readManager.findOneOrFail(AuditLog, { actor: AUDIT_PROPS.actor });
            const event = await readManager.findOneOrFail(Outbox, { destinationTopic: KafkaTopic.MESSAGE_DISPATCH });
            const result6 = audit.input;

            // Assert
            expect(result).toEqual({ status: "processed", value: undefined });
            expect(result1).toEqual({ status: "duplicate" });
            expect(result2).toBe(1);
            expect(result3).toBe(0);
            expect(result4).toBe(2);
            expect(result5).toBe(1);
            expect(result6).toEqual({ password: "masked:payload-secret" });
            expect(event.payload).toEqual(props.payload);
        });

        it("[case] - deduplicates concurrent payload deliveries", async () => {
            // Arrange
            const { service, readManager } = suite.repository();
            const outcomes = await Promise.all([service.consume(props), service.consume(props)]);

            // Act
            readManager.clear();
            const result2 = await readManager.count(Inbox, {});

            const result3 = await readManager.count(AuditLog, {});

            const result4 = await readManager.count(Outbox, {});

            // Assert
            expect(outcomes.map(({ status }) => status).sort()).toEqual(["duplicate", "processed"]);
            expect(result2).toBe(1);
            expect(result3).toBe(1);
            expect(result4).toBe(2);
        });

        it.each(["outbox", "audit"] as const)(
            "[case] - rolls back a failed %s and permits payload redelivery",
            async (stage) => {
                // Arrange
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

                // Act
                const result = failing.consume(props);
                await Promise.allSettled([result]);
                readManager.clear();
                const result2 = await readManager.count(Inbox, {});

                const result3 = await readManager.count(AuditLog, {});

                const result4 = await readManager.count(Outbox, {});

                const result5 = await readManager.count(ChangeLog, {});

                const result6 = await service.consume(props);

                readManager.clear();
                const result7 = await readManager.count(Inbox, {});

                const result8 = await readManager.count(AuditLog, {});

                const result9 = await readManager.count(Outbox, {});

                // Assert
                await expect(result).rejects.toBe(error);
                expect(result2).toBe(0);
                expect(result3).toBe(0);
                expect(result4).toBe(0);
                expect(result5).toBe(0);
                expect(result6).toEqual({ status: "processed", value: undefined });
                expect(result7).toBe(1);
                expect(result8).toBe(1);
                expect(result9).toBe(2);
            },
        );
    });
});
