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

describe("[Commands] - Notification", () => {
    describe("[Method] - create", () => {
        it("[case] - creates messages inside message consumption and schedules their dispatch", async () => {
            // Arrange
            const { commands, notificationService, consume, transaction } = helpers.commands();
            const input = {
                sourceService: PlatformService.IDENTITY_SERVICE,
                category: NotificationCategory.SYSTEM,
                template: "unit.template",
                account: ACCOUNT,
                title: "Title",
                locale: null,
                dedupKey: ID,
                realm: REALM,
                body: "Body",
            };
            const notification = helpers.createNotification();
            const messages = [helpers.createMessage()];
            notificationService.create.mockResolvedValue({ notification, messages });

            // Act
            await commands.create({ input, incoming: INCOMING, context: CONTEXT, actor: ACTOR });
            const result = notificationService.register;
            const result1 = notificationService.create.mock.calls;
            const result2 = await consume.mock.results[0]?.value;

            // Assert
            expect(result).not.toHaveBeenCalled();
            expect(result1).toEqual([[{ input, transaction: transaction.entityManager }]]);
            expect(result2).toEqual({ status: "processed", value: { messages } });
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

    describe("[Method] - cancel", () => {
        it("[case] - delegates cancellation to one domain operation and forwards replacement messages to outbox", async () => {
            // Arrange
            const { commands, notificationService, transaction, consume } = helpers.commands();
            const input = {
                dedupKey: ID,
                override: {
                    account: ACCOUNT,
                    sourceService: PlatformService.IDENTITY_SERVICE,
                    category: NotificationCategory.SYSTEM,
                    template: "replacement",
                    locale: null,
                },
            };
            const messages = [helpers.createMessage()];
            notificationService.cancel.mockResolvedValue({ messages });

            // Act
            await commands.cancel({ input, incoming: INCOMING, context: CONTEXT });
            const result = notificationService.cancel;
            const result1 = notificationService.cancel;
            const result2 = notificationService.create;
            const result3 = notificationService.register;
            const result4 = transaction.flush;
            const result5 = consume;
            const result6 = await consume.mock.results[0]?.value;

            // Assert
            expect(result).toHaveBeenCalledTimes(1);
            expect(result1).toHaveBeenCalledWith({ input, transaction: transaction.entityManager });
            expect(result2).not.toHaveBeenCalled();
            expect(result3).not.toHaveBeenCalled();
            expect(result4).not.toHaveBeenCalled();
            expect(result5).toHaveBeenCalledWith(
                expect.objectContaining({
                    incoming: INCOMING,
                    outbox: expect.objectContaining({
                        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                        actionType: MessageDispatchAction.DISPATCH,
                    }),
                }),
            );
            expect(result6).toEqual({ status: "processed", value: { messages } });
        });

        it("[case] - propagates cancellation failure without executing another domain operation", async () => {
            // Arrange
            const { commands, notificationService } = helpers.commands();
            notificationService.cancel.mockRejectedValue(new Error("queue unavailable"));

            // Act
            const result = commands.cancel({
                input: {
                    dedupKey: ID,
                    override: {
                        account: ACCOUNT,
                        sourceService: PlatformService.IDENTITY_SERVICE,
                        category: NotificationCategory.SYSTEM,
                        template: "replacement",
                        locale: null,
                    },
                },
                incoming: INCOMING,
                context: CONTEXT,
            });
            await Promise.allSettled([result]);
            const result1 = notificationService.create;

            // Assert
            await expect(result).rejects.toThrow("queue unavailable");
            expect(result1).not.toHaveBeenCalled();
            expect(notificationService.register).not.toHaveBeenCalled();
        });
    });

    describe("[Method] - register", () => {
        it.each(["email", "phone"] as const)("[case] - delegates %s registration to one domain operation", async (type) => {
            // Arrange
            const { commands, notificationService, transaction, consume } = helpers.commands();
            const messages = [helpers.createMessage()];
            notificationService.register.mockResolvedValue({ notification: helpers.createNotification(), messages });

            // Act
            await commands.register({
                input: {
                    account: ACCOUNT,
                    identifier: { id: ID, type, value: "destination" },
                    title: "Verify account",
                    language: "en",
                    body: "OTP",
                },
                context: CONTEXT,
                incoming: INCOMING,
            });
            const result = notificationService.register;
            const result1 = notificationService.register;
            const result2 = notificationService.create;
            const result3 = transaction.flush;
            const result4 = consume;
            const result5 = consume;
            const result6 = await consume.mock.results[0]?.value;

            // Assert
            expect(result).toHaveBeenCalledTimes(1);
            expect(result1).toHaveBeenCalledWith({
                input: {
                    account: ACCOUNT,
                    sourceIdentifier: ID,
                    address: "destination",
                    type: type === "email" ? ChannelType.EMAIL : ChannelType.SMS,
                    title: "Verify account",
                    language: "en",
                    body: "OTP",
                },
                transaction: transaction.entityManager,
            });
            expect(result2).not.toHaveBeenCalled();
            expect(result3).not.toHaveBeenCalled();
            expect(result4).toHaveBeenCalledTimes(1);
            expect(result5).toHaveBeenCalledWith(
                expect.objectContaining({
                    incoming: INCOMING,
                    outbox: expect.objectContaining({
                        destinationTopic: KafkaTopic.MESSAGE_DISPATCH,
                        actionType: MessageDispatchAction.DISPATCH,
                    }),
                }),
            );
            expect(result6).toEqual({ status: "processed", value: { messages } });
        });

        it("[case] - propagates a registration failure without calling generic notification creation", async () => {
            // Arrange
            const { commands, notificationService, transaction } = helpers.commands();
            notificationService.register.mockRejectedValue(new Error("channel unavailable"));

            // Act
            const result = commands.register({
                input: {
                    account: ACCOUNT,
                    identifier: { id: ID, type: "email", value: "user@example.test" },
                    title: "Verify account",
                    language: "en",
                    body: "OTP",
                },
                context: CONTEXT,
                incoming: INCOMING,
            });
            await Promise.allSettled([result]);
            const result1 = notificationService.create;

            // Assert
            await expect(result).rejects.toThrow("channel unavailable");
            expect(result1).not.toHaveBeenCalled();
            expect(transaction.flush).not.toHaveBeenCalled();
        });
    });
});
