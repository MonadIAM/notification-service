import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { NotificationUnitHelpers } from "~testing/unit/domain-service/notification.helpers";
import { NotificationCategory, MessageStatus, PlatformService, ChannelType, MessageTemplate } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-300000000001";
const IN_APP_CHANNEL_ID = "00000000-0000-4000-8000-300000000002";
const EMAIL_CHANNEL_ID = "00000000-0000-4000-8000-300000000003";

const helpers = new NotificationUnitHelpers();

function createRecipient(props: { channels?: Entities.Channel[]; preferences?: Entities.Preference[] } = {}): {
    recipient: Entities.Recipient;
} {
    const recipient = helpers.createRecipient({ account: ACCOUNT_ID });

    recipient.channels = helpers.collection({ owner: recipient, items: props.channels ?? [] });
    recipient.preferences = helpers.collection({ owner: recipient, items: props.preferences ?? [] });

    return { recipient };
}

function createInput(
    overrides: Partial<Services.Notification.Create.Props["input"]> = {},
): Services.Notification.Create.Props["input"] {
    return {
        sourceService: PlatformService.IDENTITY_SERVICE,
        category: NotificationCategory.SECURITY,
        template: "unit.template",
        account: ACCOUNT_ID,
        title: "Unit Title",
        body: "Unit Body",
        ...overrides,
    };
}

describe("NotificationService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create", () => {
        it("creates messages only for resolved channel types the recipient actually has", async () => {
            const { recipient } = createRecipient({ channels: [] });
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, repositories, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(result.messages).toHaveLength(1);
            expect(result.messages[0].channelType).toBe(ChannelType.IN_APP);
            expect(transaction.persist).toHaveBeenNthCalledWith(1, result.notification);
        });

        it("marks an in-app message as sent and delivered right away", async () => {
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            expect(result.messages[0].status).toBe(MessageStatus.DELIVERED);
            expect(result.messages[0].sentAt).toBeInstanceOf(Date);
            expect(result.messages[0].deliveredAt).toBeInstanceOf(Date);
        });

        it("falls back to the recipient account as address for channels without one", async () => {
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            const email = helpers.createChannel({
                address: "user@example.com",
                type: ChannelType.EMAIL,
                id: EMAIL_CHANNEL_ID,
                recipient,
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp, email] });
            const { service, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            const inAppMessage = result.messages.find(({ channelType }) => channelType === ChannelType.IN_APP);
            const emailMessage = result.messages.find(({ channelType }) => channelType === ChannelType.EMAIL);

            expect(inAppMessage?.address).toBe(ACCOUNT_ID);
            expect(emailMessage?.address).toBe("user@example.com");
        });
    });

    describe("resolveChannelTypes", () => {
        it.each([
            {
                category: NotificationCategory.SECURITY,
                isDuplicationEnabled: false,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: undefined,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: true,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: false,
                expected: [ChannelType.IN_APP],
            },
        ])(
            "resolves $category with email preference $isDuplicationEnabled",
            ({ category, isDuplicationEnabled, expected }) => {
                const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
                if (isDuplicationEnabled !== undefined) {
                    const preference = helpers.createPreference({
                        channelType: ChannelType.EMAIL,
                        isDuplicationEnabled,
                        recipient,
                        category,
                    });
                    recipient.preferences = helpers.collection({ owner: recipient, items: [preference] });
                }
                const { service } = helpers.service({ recipient });

                const result = service.resolveChannelTypes({ recipient, category });

                expect(result).toEqual(expected);
            },
        );
    });

    describe("register", () => {
        it.each([ChannelType.EMAIL, ChannelType.SMS])(
            "creates a new recipient and registration delivery for %s without flushing or rereading pending objects",
            async (type) => {
                const { service, repositories, transaction } = helpers.service();
                repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(null));
                const result = await service.register({
                    transaction: transaction.entityManager,
                    input: {
                        account: ACCOUNT_ID,
                        sourceIdentifier: "identifier-id",
                        address: "destination",
                        type,
                        title: "Verify account",
                        body: "OTP",
                    },
                });

                expect(result.notification).toMatchObject({
                    template: MessageTemplate.ACCOUNT_VERIFICATION_OTP,
                    sourceService: PlatformService.IDENTITY_SERVICE,
                    category: NotificationCategory.SECURITY,
                    recipient: { account: ACCOUNT_ID },
                });
                expect(result.messages).toHaveLength(1);
                expect(result.messages[0]).toMatchObject({
                    notification: result.notification,
                    channelType: type,
                    address: "destination",
                    channel: { sourceIdentifier: "identifier-id", recipient: result.notification.recipient },
                });
                expect(transaction.persist).toHaveBeenCalledWith(result.notification.recipient);
                expect(transaction.persist).toHaveBeenCalledWith(
                    expect.objectContaining({
                        sourceIdentifier: "identifier-id",
                        recipient: result.notification.recipient,
                        type,
                    }),
                );
                expect(transaction.persist).toHaveBeenCalledWith(result.notification);
                expect(transaction.persist).toHaveBeenCalledWith(result.messages[0]);
                expect(transaction.flush).not.toHaveBeenCalled();
                expect(repositories.recipients.findUniqueOrThrow).not.toHaveBeenCalled();
                expect(repositories.channels.findUnique).not.toHaveBeenCalled();
            },
        );

        it("reuses the existing recipient and channel when resending registration OTP", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const phone = helpers.createChannel({
                recipient,
                type: ChannelType.SMS,
                sourceIdentifier: "phone-id",
                address: "+79990000000",
                isVerified: false,
            });
            const email = helpers.createChannel({ recipient, type: ChannelType.EMAIL, sourceIdentifier: "email-id" });
            recipient.channels = helpers.collection({ owner: recipient, items: [phone, email] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            const result = await service.register({
                transaction: transaction.entityManager,
                input: {
                    account: recipient.account,
                    sourceIdentifier: "phone-id",
                    address: "+79990000000",
                    type: ChannelType.SMS,
                    title: "Verify account",
                    body: "New OTP",
                },
            });

            expect(result.notification.recipient).toBe(recipient);
            expect(result.messages).toHaveLength(1);
            expect(result.messages[0]).toMatchObject({ channelType: ChannelType.SMS, channel: phone });
            expect(transaction.persist).toHaveBeenCalledTimes(2);
            expect(transaction.flush).not.toHaveBeenCalled();
        });

        it("does not create notification or message when the channel belongs to another identifier", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ recipient, type: ChannelType.EMAIL, sourceIdentifier: "original" });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            await expect(
                service.register({
                    input: {
                        account: ACCOUNT_ID,
                        sourceIdentifier: "different",
                        type: ChannelType.EMAIL,
                        address: "user@example.test",
                        title: "Verify account",
                        body: "OTP",
                    },
                    transaction: transaction.entityManager,
                }),
            ).rejects.toThrow("services.channel.IDENTIFIER_MISMATCH");
            expect(transaction.persist).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
        });
    });

    describe("cancel", () => {
        it("ignores cancellation when the original notification is absent", async () => {
            const { service, repositories, dispatchDelayQueue, transaction } = helpers.service();
            repositories.notifications.findUnique.mockImplementation(() => Promise.resolve(null));
            const create = jest.spyOn(service, "create");
            await expect(
                service.cancel({
                    input: { dedupKey: "original", override: createInput() },
                    transaction: transaction.entityManager,
                }),
            ).resolves.toEqual({ messages: [] });
            expect(create).not.toHaveBeenCalled();
            expect(dispatchDelayQueue.cancel).not.toHaveBeenCalled();
            expect(transaction.merge).not.toHaveBeenCalled();
        });

        it.each([true, false])(
            "cancels messages or creates a replacement when queue removal succeeds: %s",
            async (removed) => {
                const { service, repositories, dispatchDelayQueue, transaction } = helpers.service();
                const notification = helpers.createNotification();
                const inApp = helpers.createMessage({
                    notification,
                    channelType: ChannelType.IN_APP,
                    status: MessageStatus.DELIVERED,
                });
                const queued = helpers.createMessage({
                    notification,
                    channelType: ChannelType.EMAIL,
                    status: MessageStatus.QUEUED,
                });
                const sent = helpers.createMessage({
                    notification,
                    channelType: ChannelType.EMAIL,
                    status: MessageStatus.SENT,
                });
                notification.messages = helpers.collection({ owner: notification, items: [inApp, queued, sent] });
                repositories.notifications.findUnique.mockImplementation(() => Promise.resolve(notification));
                dispatchDelayQueue.cancel.mockResolvedValue(removed);
                const messages = [helpers.createMessage()];
                const create = jest.spyOn(service, "create").mockResolvedValue({ notification, messages });
                const override = createInput();

                const result = await service.cancel({
                    input: { dedupKey: "original", override },
                    transaction: transaction.entityManager,
                });

                expect(repositories.notifications.findUnique).toHaveBeenCalledWith({
                    options: { populate: ["messages"] },
                    where: { dedupKey: "original" },
                    transaction: transaction.entityManager,
                });
                expect(dispatchDelayQueue.cancel.mock.calls).toEqual([[{ message: queued.id }]]);
                if (removed) {
                    expect(inApp.status).toBe(MessageStatus.CANCELLED);
                    expect(queued.status).toBe(MessageStatus.CANCELLED);
                    expect(create).not.toHaveBeenCalled();
                } else {
                    expect(inApp.status).toBe(MessageStatus.DELIVERED);
                    expect(queued.status).toBe(MessageStatus.QUEUED);
                    expect(create).toHaveBeenCalledWith({ input: override, transaction: transaction.entityManager });
                    expect(transaction.merge).not.toHaveBeenCalled();
                }
                expect(sent.status).toBe(MessageStatus.SENT);
                expect(result).toEqual({ messages: removed ? [] : messages });
                expect(transaction.flush).not.toHaveBeenCalled();
            },
        );

        it("does not cancel messages or create replacements when the queue fails", async () => {
            const { service, repositories, dispatchDelayQueue, transaction } = helpers.service();
            const notification = helpers.createNotification();
            const queued = helpers.createMessage({
                notification,
                channelType: ChannelType.EMAIL,
                status: MessageStatus.QUEUED,
            });
            notification.messages = helpers.collection({ owner: notification, items: [queued] });
            repositories.notifications.findUnique.mockImplementation(() => Promise.resolve(notification));
            dispatchDelayQueue.cancel.mockRejectedValue(new Error("queue unavailable"));
            const create = jest.spyOn(service, "create");
            await expect(
                service.cancel({
                    input: { dedupKey: "original", override: createInput() },
                    transaction: transaction.entityManager,
                }),
            ).rejects.toThrow("queue unavailable");
            expect(queued.status).toBe(MessageStatus.QUEUED);
            expect(create).not.toHaveBeenCalled();
            expect(transaction.merge).not.toHaveBeenCalled();
        });
    });
});
