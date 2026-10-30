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
        locale: "en",
        ...overrides,
    };
}

describe("[DomainService] - Notification", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - creates messages only for resolved channel types the recipient actually has", async () => {
            // Arrange
            const { recipient } = createRecipient({ channels: [] });
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, repositories, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });
            const result1 = repositories.recipients.findUniqueOrThrow;
            const result2 = result.messages;
            const result3 = result.messages[0].channelType;

            // Assert
            expect(result1).toHaveBeenCalledWith({
                options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(result2).toHaveLength(1);
            expect(result3).toBe(ChannelType.IN_APP);
            expect(transaction.persist).toHaveBeenNthCalledWith(1, result.notification);
        });

        it("[case] - marks an in-app message as sent and delivered right away", async () => {
            // Arrange
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });
            const result1 = result.messages[0].status;
            const result2 = result.messages[0].sentAt;

            // Assert
            expect(result1).toBe(MessageStatus.DELIVERED);
            expect(result2).toBeInstanceOf(Date);
            expect(result.messages[0].deliveredAt).toBeInstanceOf(Date);
        });

        it("[case] - falls back to the recipient account as address for channels without one", async () => {
            // Arrange
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            const email = helpers.createChannel({
                address: "user@example.com",
                sourceIdentifier: EMAIL_CHANNEL_ID,
                type: ChannelType.EMAIL,
                id: EMAIL_CHANNEL_ID,
                isVerified: true,
                recipient,
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp, email] });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });
            const inAppMessage = result.messages.find(({ channelType }) => channelType === ChannelType.IN_APP);
            const emailMessage = result.messages.find(({ channelType }) => channelType === ChannelType.EMAIL);
            const result1 = inAppMessage?.address;

            // Assert
            expect(result1).toBe(ACCOUNT_ID);
            expect(emailMessage?.address).toBe("user@example.com");
        });
    });

    describe("[Method] - resolveChannelTypes", () => {
        it.each([
            {
                category: NotificationCategory.SECURITY,
                isDuplicationEnabled: false,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: undefined,
                expected: [ChannelType.IN_APP],
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
            "[case] - resolves $category with email preference $isDuplicationEnabled",
            ({ category, isDuplicationEnabled, expected }) => {
                // Arrange
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

                // Act
                const result = service.resolveChannelTypes({ recipient, category });

                // Assert
                expect(result).toEqual(expected);
            },
        );
    });

    describe("[Method] - register", () => {
        it.each([ChannelType.EMAIL, ChannelType.SMS])(
            "[case] - creates a new recipient and registration delivery for %s without flushing or rereading pending objects",
            async (type) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();
                repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(null));

                // Act
                const result = await service.register({
                    transaction: transaction.entityManager,
                    input: {
                        account: ACCOUNT_ID,
                        sourceIdentifier: "identifier-id",
                        title: "Verify account",
                        address: "destination",
                        language: "en",
                        body: "OTP",
                        type,
                    },
                });
                const result1 = result.notification;
                const result2 = result.messages;
                const result3 = result.messages[0];
                const result4 = transaction.persist;
                const result5 = transaction.persist;
                const result6 = transaction.persist;
                const result7 = transaction.persist;
                const result8 = transaction.flush;
                const result9 = repositories.recipients.findUniqueOrThrow;

                // Assert
                expect(result1).toMatchObject({
                    template: MessageTemplate.ACCOUNT_VERIFICATION_OTP,
                    sourceService: PlatformService.IDENTITY_SERVICE,
                    category: NotificationCategory.SECURITY,
                    recipient: { account: ACCOUNT_ID },
                });
                expect(result2).toHaveLength(1);
                expect(result3).toMatchObject({
                    notification: result.notification,
                    channelType: type,
                    address: "destination",
                    channel: { sourceIdentifier: "identifier-id", recipient: result.notification.recipient },
                });
                expect(result4).toHaveBeenCalledWith(result.notification.recipient);
                expect(result5).toHaveBeenCalledWith(
                    expect.objectContaining({
                        sourceIdentifier: "identifier-id",
                        recipient: result.notification.recipient,
                        type,
                    }),
                );
                expect(result6).toHaveBeenCalledWith(result.notification);
                expect(result7).toHaveBeenCalledWith(result.messages[0]);
                expect(result8).not.toHaveBeenCalled();
                expect(result9).not.toHaveBeenCalled();
                expect(repositories.channels.findUnique).not.toHaveBeenCalled();
            },
        );

        it("[case] - reuses the existing recipient and channel when resending registration OTP", async () => {
            // Arrange
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

            // Act
            const result = await service.register({
                transaction: transaction.entityManager,
                input: {
                    account: recipient.account,
                    sourceIdentifier: "phone-id",
                    address: "+79990000000",
                    type: ChannelType.SMS,
                    title: "Verify account",
                    body: "New OTP",
                    language: "en",
                },
            });
            const result1 = result.notification.recipient;
            const result2 = result.messages;
            const result3 = result.messages[0];
            const result4 = transaction.persist;

            // Assert
            expect(result1).toBe(recipient);
            expect(result2).toHaveLength(1);
            expect(result3).toMatchObject({ channelType: ChannelType.SMS, channel: phone });
            expect(result4).toHaveBeenCalledTimes(2);
            expect(transaction.flush).not.toHaveBeenCalled();
        });

        it("[case] - does not create notification or message when the channel belongs to another identifier", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ recipient, type: ChannelType.EMAIL, sourceIdentifier: "original" });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            // Act
            const result = service.register({
                input: {
                    account: ACCOUNT_ID,
                    sourceIdentifier: "different",
                    address: "user@example.test",
                    type: ChannelType.EMAIL,
                    title: "Verify account",
                    language: "en",
                    body: "OTP",
                },
                transaction: transaction.entityManager,
            });
            await Promise.allSettled([result]);
            const result1 = transaction.persist;

            // Assert
            await expect(result).rejects.toThrow("services.channel.IDENTIFIER_MISMATCH");
            expect(result1).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
        });
    });

    describe("[Method] - cancel", () => {
        it("[case] - ignores cancellation when the original notification is absent", async () => {
            // Arrange
            const { service, repositories, dispatchDelayQueue, transaction } = helpers.service();
            repositories.notifications.findUnique.mockImplementation(() => Promise.resolve(null));
            const create = jest.spyOn(service, "create");

            // Act
            const result = await service.cancel({
                input: { dedupKey: "original", override: createInput() },
                transaction: transaction.entityManager,
            });
            const result1 = create;
            const result2 = dispatchDelayQueue.cancel;

            // Assert
            expect(result).toEqual({ messages: [] });
            expect(result1).not.toHaveBeenCalled();
            expect(result2).not.toHaveBeenCalled();
            expect(transaction.merge).not.toHaveBeenCalled();
        });

        it.each([true, false])(
            "[case] - cancels messages or creates a replacement when queue removal succeeds: %s",
            async (removed) => {
                // Arrange
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

                // Act
                const result = await service.cancel({
                    input: { dedupKey: "original", override },
                    transaction: transaction.entityManager,
                });
                const result1 = repositories.notifications.findUnique;
                const result2 = dispatchDelayQueue.cancel.mock.calls;
                const result3 = sent.status;
                const result4 = result;

                // Assert
                expect(result1).toHaveBeenCalledWith({
                    options: { populate: ["messages"] },
                    where: { dedupKey: "original" },
                    transaction: transaction.entityManager,
                });
                expect(result2).toEqual([[{ message: queued.id }]]);
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
                expect(result3).toBe(MessageStatus.SENT);
                expect(result4).toEqual({ messages: removed ? [] : messages });
                expect(transaction.flush).not.toHaveBeenCalled();
            },
        );

        it("[case] - does not cancel messages or create replacements when the queue fails", async () => {
            // Arrange
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

            // Act
            const result = service.cancel({
                input: { dedupKey: "original", override: createInput() },
                transaction: transaction.entityManager,
            });
            await Promise.allSettled([result]);
            const result1 = queued.status;
            const result2 = create;

            // Assert
            await expect(result).rejects.toThrow("queue unavailable");
            expect(result1).toBe(MessageStatus.QUEUED);
            expect(result2).not.toHaveBeenCalled();
            expect(transaction.merge).not.toHaveBeenCalled();
        });
    });

    describe("[Behavior] - disabled email delivery", () => {
        it("[case] - does not create security email messages after the channel loses its identifier", async () => {
            // Arrange
            const { recipient } = createRecipient();
            const channel = helpers.createChannel({ recipient, type: ChannelType.EMAIL });
            channel.clearIdentifier();
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({ input: createInput(), transaction: transaction.entityManager });

            // Assert
            expect(result.messages).toHaveLength(0);
        });
    });
});
