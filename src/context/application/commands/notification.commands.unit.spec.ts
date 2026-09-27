import { describe, expect, it } from "@jest/globals";

import { MessageDispatchAction, NotificationCategory, PlatformService, ChannelType, KafkaTopic } from "~context/enums";
import { NotificationCommandsUnitHelpers } from "~testing/unit/command-services/notification.helpers";

const INCOMING: TransactionManager.Service.IncomingMessage = { consumerKey: "unit-consumer", event: "incoming-event" };
const CONTEXT: Extract.Meta = { ip: "127.0.0.1", userAgent: "unit-test" };
const helpers = new NotificationCommandsUnitHelpers();
const ACCOUNT = "target-account";
const ACTOR = "actor-account";
const REALM = "realm-a";
const ID = "entity-a";

describe("NotificationCommands", () => {
    describe("create", () => {
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

            expect(notificationService.register).not.toHaveBeenCalled();
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
    });

    describe("cancel", () => {
        it("delegates cancellation to one domain operation and forwards replacement messages to outbox", async () => {
            const { commands, notificationService, transaction, consume } = helpers.commands();
            const input = {
                dedupKey: ID,
                override: {
                    account: ACCOUNT,
                    sourceService: PlatformService.IDENTITY_SERVICE,
                    category: NotificationCategory.SYSTEM,
                    template: "replacement",
                },
            };
            const messages = [helpers.createMessage()];
            notificationService.cancel.mockResolvedValue({ messages });

            await commands.cancel({ input, incoming: INCOMING, context: CONTEXT });

            expect(notificationService.cancel).toHaveBeenCalledTimes(1);
            expect(notificationService.cancel).toHaveBeenCalledWith({ input, transaction: transaction.entityManager });
            expect(notificationService.create).not.toHaveBeenCalled();
            expect(notificationService.register).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
            expect(consume).toHaveBeenCalledWith(
                expect.objectContaining({
                    incoming: INCOMING,
                    outbox: expect.objectContaining({
                        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                        actionType: MessageDispatchAction.DISPATCH,
                    }),
                }),
            );
            await expect(consume.mock.results[0]?.value).resolves.toEqual({ status: "processed", value: { messages } });
        });

        it("propagates cancellation failure without executing another domain operation", async () => {
            const { commands, notificationService } = helpers.commands();
            notificationService.cancel.mockRejectedValue(new Error("queue unavailable"));
            await expect(
                commands.cancel({
                    input: {
                        dedupKey: ID,
                        override: {
                            account: ACCOUNT,
                            sourceService: PlatformService.IDENTITY_SERVICE,
                            category: NotificationCategory.SYSTEM,
                            template: "replacement",
                        },
                    },
                    incoming: INCOMING,
                    context: CONTEXT,
                }),
            ).rejects.toThrow("queue unavailable");
            expect(notificationService.create).not.toHaveBeenCalled();
            expect(notificationService.register).not.toHaveBeenCalled();
        });
    });

    describe("register", () => {
        it.each(["email", "phone"] as const)("delegates %s registration to one domain operation", async (type) => {
            const { commands, notificationService, transaction, consume } = helpers.commands();
            const messages = [helpers.createMessage()];
            notificationService.register.mockResolvedValue({ notification: helpers.createNotification(), messages });

            await commands.register({
                input: {
                    account: ACCOUNT,
                    identifier: { id: ID, type, value: "destination" },
                    title: "Verify account",
                    body: "OTP",
                },
                context: CONTEXT,
                incoming: INCOMING,
            });

            expect(notificationService.register).toHaveBeenCalledTimes(1);
            expect(notificationService.register).toHaveBeenCalledWith({
                input: {
                    account: ACCOUNT,
                    sourceIdentifier: ID,
                    address: "destination",
                    type: type === "email" ? ChannelType.EMAIL : ChannelType.SMS,
                    title: "Verify account",
                    body: "OTP",
                },
                transaction: transaction.entityManager,
            });
            expect(notificationService.create).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
            expect(consume).toHaveBeenCalledTimes(1);
            expect(consume).toHaveBeenCalledWith(
                expect.objectContaining({
                    incoming: INCOMING,
                    outbox: expect.objectContaining({
                        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                        actionType: MessageDispatchAction.DISPATCH,
                    }),
                }),
            );
            await expect(consume.mock.results[0]?.value).resolves.toEqual({ status: "processed", value: { messages } });
        });

        it("propagates a registration failure without calling generic notification creation", async () => {
            const { commands, notificationService, transaction } = helpers.commands();
            notificationService.register.mockRejectedValue(new Error("channel unavailable"));
            await expect(
                commands.register({
                    input: {
                        account: ACCOUNT,
                        identifier: { id: ID, type: "email", value: "user@example.test" },
                        title: "Verify account",
                        body: "OTP",
                    },
                    context: CONTEXT,
                    incoming: INCOMING,
                }),
            ).rejects.toThrow("channel unavailable");
            expect(notificationService.create).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
        });
    });
});
