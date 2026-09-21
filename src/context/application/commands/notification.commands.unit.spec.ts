import { describe, expect, it } from "@jest/globals";

import { NotificationCommandsUnitHelpers } from "~testing/unit/command-services/notification.helpers";
import {
    MessageDispatchAction,
    NotificationCategory,
    PlatformService,
    MessageStatus,
    ChannelType,
    KafkaTopic,
} from "~context/enums";

const INCOMING: TransactionManager.Service.IncomingMessage = { consumerKey: "unit-consumer", event: "incoming-event" };
const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new NotificationCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const REALM = "realm-a";
const ID = "entity-a";

describe("NotificationCommands", () => {
    it("creates messages inside message consumption and schedules their dispatch", async () => {
        const { commands, notificationService, consume, transaction } = helpers.commands();
        const input = {
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SYSTEM,
            template: "unit.template",
            account: ACCOUNT,
            title: "Title",
            dedupKey: ID,
            realm: REALM,
            body: "Body",
        };
        const notification = helpers.createNotification();
        const messages = [helpers.createMessage()];
        notificationService.create.mockResolvedValue({ notification, messages });

        await commands.create({ input, incoming: INCOMING, context: CONTEXT, actor: ACTOR });

        expect(notificationService.create.mock.calls).toEqual([[{ input, transaction: transaction.entityManager }]]);
        await expect(consume.mock.results[0]?.value).resolves.toEqual({ status: "processed", value: { messages } });
        expect(consume.mock.calls).toEqual([
            [
                expect.objectContaining({
                    incoming: INCOMING,
                    outbox: expect.objectContaining({
                        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                        actionType: MessageDispatchAction.DISPATCH,
                    }),
                }),
            ],
        ]);
    });

    it("does nothing when the original notification is absent", async () => {
        const { commands, notificationRepository, notificationService, messageService, dispatchDelayQueue } =
            helpers.commands();
        notificationRepository.findUnique.mockResolvedValue(null);
        const override = {
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SYSTEM,
            template: "replacement",
            account: ACCOUNT,
        };

        await commands.cancel({ input: { dedupKey: ID, override }, incoming: INCOMING, context: CONTEXT });

        expect(dispatchDelayQueue.cancel).not.toHaveBeenCalled();
        expect(notificationService.create).not.toHaveBeenCalled();
        expect(messageService.markCancelled).not.toHaveBeenCalled();
    });

    it.each([true, false])(
        "cancels queued deliveries or creates a replacement when removal succeeds: %s",
        async (removed) => {
            const {
                commands,
                notificationRepository,
                notificationService,
                messageService,
                dispatchDelayQueue,
                transaction,
                consume,
            } = helpers.commands();
            const notification = helpers.createNotification();
            const inApp = helpers.createMessage({
                id: "in-app",
                notification,
                channelType: ChannelType.IN_APP,
                status: MessageStatus.DELIVERED,
            });
            const queued = helpers.createMessage({
                id: "queued",
                notification,
                channelType: ChannelType.EMAIL,
                status: MessageStatus.QUEUED,
            });
            const sent = helpers.createMessage({
                id: "sent",
                notification,
                channelType: ChannelType.EMAIL,
                status: MessageStatus.SENT,
            });
            notification.messages = helpers.collection({ owner: notification, items: [inApp, queued, sent] });
            const override = {
                account: ACCOUNT,
                sourceService: PlatformService.IDENTITY_SERVICE,
                category: NotificationCategory.SYSTEM,
                template: "replacement",
            };
            const messages = [helpers.createMessage()];
            notificationRepository.findUnique.mockResolvedValue(notification);
            dispatchDelayQueue.cancel.mockResolvedValue(removed);
            notificationService.create.mockResolvedValue({ notification, messages });

            await commands.cancel({ input: { dedupKey: ID, override }, incoming: INCOMING, context: CONTEXT });

            expect(notificationRepository.findUnique.mock.calls).toEqual([
                [{ options: { populate: ["messages"] }, where: { dedupKey: ID }, transaction: transaction.entityManager }],
            ]);
            expect(dispatchDelayQueue.cancel).toHaveBeenCalledTimes(1);
            expect(dispatchDelayQueue.cancel.mock.calls).toEqual([[{ message: "queued" }]]);
            if (removed) {
                expect(messageService.markCancelled.mock.calls).toEqual([
                    [{ input: { messages: [inApp, queued] }, transaction: transaction.entityManager }],
                ]);
                expect(notificationService.create).not.toHaveBeenCalled();
            } else {
                expect(messageService.markCancelled).not.toHaveBeenCalled();
                expect(notificationService.create.mock.calls).toEqual([
                    [{ input: override, transaction: transaction.entityManager }],
                ]);
            }
            await expect(consume.mock.results[0]?.value).resolves.toEqual({
                status: "processed",
                value: { messages: removed ? [] : messages },
            });
        },
    );

    it("propagates a queue failure without marking messages cancelled or creating a replacement", async () => {
        const { commands, notificationRepository, notificationService, messageService, dispatchDelayQueue } =
            helpers.commands();
        const notification = helpers.createNotification();
        notification.messages = helpers.collection({
            owner: notification,
            items: [helpers.createMessage({ notification, channelType: ChannelType.EMAIL, status: MessageStatus.QUEUED })],
        });
        notificationRepository.findUnique.mockResolvedValue(notification);
        const failure = new Error("queue unavailable");
        dispatchDelayQueue.cancel.mockRejectedValue(failure);
        const override = {
            account: ACCOUNT,
            sourceService: PlatformService.IDENTITY_SERVICE,
            category: NotificationCategory.SYSTEM,
            template: "replacement",
        };

        await expect(
            commands.cancel({ input: { dedupKey: ID, override }, incoming: INCOMING, context: CONTEXT }),
        ).rejects.toBe(failure);

        expect(messageService.markCancelled).not.toHaveBeenCalled();
        expect(notificationService.create).not.toHaveBeenCalled();
    });
});
