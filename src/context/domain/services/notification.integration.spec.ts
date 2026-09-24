import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { NotificationIntegrationHelpers } from "~testing/integration/domain-service/notification.helpers";
import { NotificationCategory, PlatformService, MessageStatus, ChannelType } from "~context/enums";
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

describe("NotificationService integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("fans out a security notification to persisted in-app and email channels", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const inApp = await suite.fixtures().createChannel({
            type: ChannelType.IN_APP,
            address: undefined,
            isVerified: true,
            recipient,
        });
        const email = await suite.fixtures().createChannel({
            address: "recipient@example.test",
            type: ChannelType.EMAIL,
            isVerified: true,
            recipient,
        });

        const result = await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(recipient.account),
                transaction,
            }),
        );

        const messages = await loadMessages(suite, result.notification.id);

        expect(messages).toHaveLength(2);
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

    it("creates only an in-app message when the recipient has no email channel", async () => {
        const recipient = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({
            type: ChannelType.IN_APP,
            isVerified: true,
            recipient,
        });

        const result = await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(recipient.account),
                transaction,
            }),
        );

        await expect(loadMessages(suite, result.notification.id)).resolves.toEqual([
            expect.objectContaining({
                channelType: ChannelType.IN_APP,
                status: MessageStatus.DELIVERED,
            }),
        ]);
    });

    it("ignores a disabled email preference for the security category", async () => {
        const recipient = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({
            type: ChannelType.IN_APP,
            isVerified: true,
            recipient,
        });
        await suite.fixtures().createChannel({
            type: ChannelType.EMAIL,
            isVerified: true,
            recipient,
        });
        await suite.fixtures().createPreference({
            category: NotificationCategory.SECURITY,
            channelType: ChannelType.EMAIL,
            isDuplicationEnabled: false,
            recipient,
        });

        const result = await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(recipient.account),
                transaction,
            }),
        );

        const messages = await loadMessages(suite, result.notification.id);

        expect(messages.map(({ channelType }) => channelType).sort()).toEqual(
            [ChannelType.EMAIL, ChannelType.IN_APP].sort(),
        );
    });

    it("uses the persisted configurable preference when resolving email fan-out", async () => {
        const recipient = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({
            type: ChannelType.IN_APP,
            isVerified: true,
            recipient,
        });
        await suite.fixtures().createChannel({
            type: ChannelType.EMAIL,
            isVerified: true,
            recipient,
        });
        const preference = await suite.fixtures().createPreference({
            category: NotificationCategory.INVITES,
            channelType: ChannelType.EMAIL,
            isDuplicationEnabled: false,
            recipient,
        });

        const disabled = await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(recipient.account, {
                    category: NotificationCategory.INVITES,
                    dedupKey: "disabled",
                }),
                transaction,
            }),
        );

        await expect(loadMessages(suite, disabled.notification.id)).resolves.toEqual([
            expect.objectContaining({ channelType: ChannelType.IN_APP }),
        ]);

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

        expect(messages.map(({ channelType }) => channelType).sort()).toEqual(
            [ChannelType.EMAIL, ChannelType.IN_APP].sort(),
        );
    });

    it("rolls back a duplicate dedup key for one recipient but allows it for another", async () => {
        const recipient = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({
            type: ChannelType.IN_APP,
            isVerified: true,
            recipient,
        });
        await suite.fixtures().createChannel({
            type: ChannelType.EMAIL,
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

        await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(recipient.account, { dedupKey }),
                transaction,
            }),
        );

        await expect(countRecipientNotifications(suite, recipient.id)).resolves.toEqual({
            notifications: 1,
            messages: 2,
        });

        await expect(
            suite.transaction((transaction) =>
                suite.repository().notificationService.create({
                    input: createInput(recipient.account, {
                        title: "Duplicate",
                        dedupKey,
                    }),
                    transaction,
                }),
            ),
        ).rejects.toThrow("notification_recipient_dedup_key_unique");

        await expect(countRecipientNotifications(suite, recipient.id)).resolves.toEqual({
            notifications: 1,
            messages: 2,
        });

        await suite.transaction((transaction) =>
            suite.repository().notificationService.create({
                input: createInput(other.account, { dedupKey }),
                transaction,
            }),
        );

        await expect(countRecipientNotifications(suite, other.id)).resolves.toEqual({
            notifications: 1,
            messages: 1,
        });
    });
});
