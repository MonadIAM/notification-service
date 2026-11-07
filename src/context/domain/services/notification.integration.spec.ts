import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { NotificationCategory, PlatformService, MessageStatus, ChannelType, MessageTemplate } from "~context/enums";
import { NotificationIntegrationHelpers } from "~testing/integration/domain-service/notification.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { Notification, Preference, Message } from "~context/domain/entities";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";

const helpers = new NotificationIntegrationHelpers();

function createInput(
    account: string,
    overrides: Partial<Services.Notification.Create.Props["input"]> = {},
): Services.Notification.Create.Props["input"] {
    return {
        sourceService: PlatformService.IDENTITY_SERVICE,
        category: NotificationCategory.SECURITY,
        template: "integration.template",
        title: "Integration title",
        body: "Integration body",
        locale: "en",
        account,
        ...overrides,
    };
}

async function loadMessages(
    suite: Integration.Domain.Notification.Suite,
    notification: string,
): Promise<Entities.Message[]> {
    return await suite.transaction((transaction) =>
        transaction.find(Message, { notification }, { populate: ["channel"], orderBy: { channelType: "asc" } }),
    );
}

async function countRecipientNotifications(
    suite: Integration.Domain.Notification.Suite,
    recipient: string,
): Promise<{ notifications: number; messages: number }> {
    return await suite.transaction(async (transaction) => ({
        notifications: await transaction.count(Notification, { recipient }),
        messages: await transaction.count(Message, {
            notification: { recipient },
        }),
    }));
}

describe("[DomainService] - Notification", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - create", () => {
        it("[case] - fans out a security notification to persisted in-app and email channels", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const inApp = await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                address: undefined,
                isVerified: true,
                recipient,
            });
            const email = await suite.fixtures().createChannel({
                address: "recipient@example.test",
                sourceIdentifier: randomUUID(),
                type: ChannelType.EMAIL,
                isVerified: true,
                recipient,
            });

            // Act
            const result = await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account),
                    transaction,
                }),
            );
            const messages = await loadMessages(suite, result.notification.id);
            const result1 = messages;

            // Assert
            expect(result1).toHaveLength(2);
            expect(messages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        channel: expect.objectContaining({ id: inApp.id }),
                        channelType: ChannelType.IN_APP,
                        status: MessageStatus.DELIVERED,
                        deliveredAt: expect.any(Date),
                        address: recipient.account,
                        sentAt: expect.any(Date),
                    }),
                    expect.objectContaining({
                        channel: expect.objectContaining({ id: email.id }),
                        address: "recipient@example.test",
                        channelType: ChannelType.EMAIL,
                        status: MessageStatus.QUEUED,
                        deliveredAt: null,
                        sentAt: null,
                    }),
                ]),
            );
        });

        it("[case] - creates only an in-app message when the recipient has no email channel", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                isVerified: true,
                recipient,
            });

            // Act
            const result = await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account),
                    transaction,
                }),
            );
            const result1 = await loadMessages(suite, result.notification.id);

            // Assert
            expect(result1).toEqual([
                expect.objectContaining({
                    channelType: ChannelType.IN_APP,
                    status: MessageStatus.DELIVERED,
                }),
            ]);
        });

        it("[case] - ignores a disabled email preference for the security category", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                isVerified: true,
                recipient,
            });
            await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                sourceIdentifier: randomUUID(),
                isVerified: true,
                recipient,
            });
            await suite.fixtures().createPreference({
                category: NotificationCategory.SECURITY,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                recipient,
            });

            // Act
            const result = await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account),
                    transaction,
                }),
            );
            const messages = await loadMessages(suite, result.notification.id);
            const result1 = messages.map(({ channelType }) => channelType).sort();

            // Assert
            expect(result1).toEqual([ChannelType.EMAIL, ChannelType.IN_APP].sort());
        });

        it("[case] - uses the persisted configurable preference when resolving email fan-out", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                isVerified: true,
                recipient,
            });
            await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                sourceIdentifier: randomUUID(),
                isVerified: true,
                recipient,
            });
            const preference = await suite.fixtures().createPreference({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                recipient,
            });

            // Act
            const disabled = await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account, {
                        category: NotificationCategory.INVITES,
                        dedupKey: "disabled",
                    }),
                    transaction,
                }),
            );
            const disabledMessages = await loadMessages(suite, disabled.notification.id);
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.findOneOrFail(Preference, {
                    id: preference.id,
                });
                persisted.toggle();
            });
            const enabled = await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account, {
                        category: NotificationCategory.INVITES,
                        dedupKey: "enabled",
                    }),
                    transaction,
                }),
            );
            const messages = await loadMessages(suite, enabled.notification.id);
            const enabledChannels = messages.map(({ channelType }) => channelType).sort();

            // Assert
            expect(disabledMessages).toEqual([expect.objectContaining({ channelType: ChannelType.IN_APP })]);
            expect(enabledChannels).toEqual([ChannelType.EMAIL, ChannelType.IN_APP].sort());
        });

        it("[case] - rolls back a duplicate dedup key for one recipient but allows it for another", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                isVerified: true,
                recipient,
            });
            await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                sourceIdentifier: randomUUID(),
                isVerified: true,
                recipient,
            });
            const other = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({
                type: ChannelType.IN_APP,
                isVerified: true,
                recipient: other,
            });
            const dedupKey = randomUUID();

            // Act
            await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account, { dedupKey }),
                    transaction,
                }),
            );
            const beforeDuplicate = await countRecipientNotifications(suite, recipient.id);
            const duplicate = suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account, {
                        title: "Duplicate",
                        dedupKey,
                    }),
                    transaction,
                }),
            );
            await Promise.allSettled([duplicate]);
            const afterDuplicate = await countRecipientNotifications(suite, recipient.id);
            await suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(other.account, { dedupKey }),
                    transaction,
                }),
            );
            const otherNotifications = await countRecipientNotifications(suite, other.id);

            // Assert
            expect(beforeDuplicate).toEqual({
                notifications: 1,
                messages: 2,
            });
            await expect(duplicate).rejects.toThrow("notification_recipient_dedup_key_unique");
            expect(afterDuplicate).toEqual({
                notifications: 1,
                messages: 2,
            });
            expect(otherNotifications).toEqual({
                notifications: 1,
                messages: 1,
            });
        });
    });
});

describe("[Behavior] - HR notification delivery", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (manager) => new CoreFixture(manager),
    });

    async function recipient(): Promise<Entities.Recipient> {
        const entity = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({ recipient: entity, type: ChannelType.IN_APP, isVerified: true });
        await suite.fixtures().createChannel({
            recipient: entity,
            type: ChannelType.EMAIL,
            address: "hr@example.test",
            sourceIdentifier: randomUUID(),
            isVerified: true,
        });
        await suite.fixtures().createPreference({
            recipient: entity,
            category: NotificationCategory.SYSTEM,
            channelType: ChannelType.EMAIL,
            isDuplicationEnabled: true,
        });
        return entity;
    }

    function input(account: string): Services.Notification.Create.Props["input"] {
        return createInput(account, {
            realm: randomUUID(),
            sourceService: PlatformService.HR_SERVICE,
            category: NotificationCategory.SYSTEM,
            template: MessageTemplate.HR_APPROVAL_REQUIRED,
            dedupKey: `hr:${randomUUID()}:${randomUUID()}:ABSENCE:1:step:${randomUUID()}:1`,
        });
    }

    async function create(value: Services.Notification.Create.Props["input"]): Services.Notification.Create.Result {
        return await suite.transaction((transaction) =>
            suite.repository().notificationService.create({ transaction, input: value }),
        );
    }

    async function cancel(value: Services.Notification.Create.Props["input"]): Services.Notification.Cancel.Result {
        return await suite.transaction((transaction) =>
            suite.repository().notificationService.cancel({
                transaction,
                input: {
                    invalidate: true,
                    realm: value.realm!,
                    dedupKey: value.dedupKey!,
                    sourceService: PlatformService.HR_SERVICE,
                    recipient: value.account,
                },
            }),
        );
    }

    it("[case] - concurrent redeliveries create exactly one in-app message despite enabled email duplication", async () => {
        // Arrange
        const value = input((await recipient()).account);

        // Act
        const results = await Promise.all([create(value), create(value), create(value)]);
        const messages = await loadMessages(suite, results[0].notification.id);

        // Assert
        expect(results.flatMap((result) => result.messages)).toHaveLength(1);
        expect(messages).toEqual([
            expect.objectContaining({ channelType: ChannelType.IN_APP, status: MessageStatus.DELIVERED }),
        ]);
    });

    it.each(["before", "after", "concurrent"])(
        "[case] - cancellation %s creation cannot be undone by delayed delivery",
        async (order) => {
            // Arrange
            const value = input((await recipient()).account);

            // Act
            if (order === "before") {
                await cancel(value);
                await create(value);
            } else if (order === "after") {
                await create(value);
                await cancel(value);
            } else {
                await Promise.all([create(value), cancel(value)]);
            }
            await cancel(value);
            const repeated = await create(value);
            const messages = await loadMessages(suite, repeated.notification.id);

            // Assert
            expect(repeated.messages).toEqual([]);
            expect(messages.filter((message) => message.status === MessageStatus.DELIVERED)).toEqual([]);
            expect(
                await suite.transaction((transaction) =>
                    transaction.count(Notification, { recipient: { account: value.account }, dedupKey: value.dedupKey }),
                ),
            ).toBe(1);
        },
    );

    it("[case] - rejects conflicting source identities and explicit external delivery", async () => {
        // Arrange
        const value = input((await recipient()).account);
        const created = await create(value);

        // Act / Assert
        await expect(create({ ...value, realm: randomUUID() })).rejects.toThrow();
        await expect(
            create({ ...value, delivery: { channelType: ChannelType.EMAIL, address: "hr@example.test" } }),
        ).rejects.toThrow();
        await expect(cancel({ ...value, realm: randomUUID() })).rejects.toThrow();
        expect((await loadMessages(suite, created.notification.id))[0].status).toBe(MessageStatus.DELIVERED);
    });

    it("[case] - rolls back cancellation together with its transaction", async () => {
        // Arrange
        const value = input((await recipient()).account);

        // Act
        await expect(
            suite.transaction(async (transaction) => {
                await suite.repository().notificationService.cancel({
                    transaction,
                    input: {
                        invalidate: true,
                        realm: value.realm!,
                        dedupKey: value.dedupKey!,
                        sourceService: PlatformService.HR_SERVICE,
                        recipient: value.account,
                    },
                });
                await transaction.flush();
                throw new Error("rollback");
            }),
        ).rejects.toThrow("rollback");

        // Assert
        expect((await create(value)).messages).toHaveLength(1);
    });
});
