import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { RecipientIntegrationHelpers } from "~testing/integration/domain-service/recipient.helpers";
import { Channel, Notification, Preference, Recipient, Message } from "~context/domain/entities";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { ChannelType } from "~context/enums";

const helpers = new RecipientIntegrationHelpers();

async function loadRecipient(suite: Integration.Domain.Recipient.Suite, account: string): Promise<Entities.Recipient> {
    return await suite.transaction((transaction) =>
        transaction.findOneOrFail(Recipient, { account }, { populate: ["channels", "defaultOtpChannel"] }),
    );
}

async function countRecipientGraph(suite: Integration.Domain.Recipient.Suite, recipient: string): Promise<number> {
    return await suite.transaction(async (transaction) => {
        const [recipients, channels, preferences, notifications, messages] = await Promise.all([
            transaction.count(Recipient, { id: recipient }),
            transaction.count(Channel, { recipient }),
            transaction.count(Preference, { recipient }),
            transaction.count(Notification, { recipient }),
            transaction.count(Message, { notification: { recipient } }),
        ]);

        return recipients + channels + preferences + notifications + messages;
    });
}

describe("[DomainService] - Recipient", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - create", () => {
        it("[case] - creates a persisted recipient with a verified in-app channel", async () => {
            // Arrange
            const account = randomUUID();

            // Act
            const created = await suite.transaction(
                async (transaction) =>
                    await Promise.resolve(
                        suite.repository().recipientService.create({
                            input: { account, timezone: "Europe/Moscow", locale: "ru" },
                            transaction,
                        }),
                    ),
            );
            const recipient = await loadRecipient(suite, account);
            const result = recipient.channels.getItems().map(({ type, isVerified, soundEnabled, address }) => ({
                soundEnabled,
                isVerified,
                address,
                type,
            }));

            // Assert
            expect({
                id: recipient.id,
                account: recipient.account,
                timezone: recipient.timezone,
                locale: recipient.locale,
            }).toEqual({ id: created.id, account, timezone: "Europe/Moscow", locale: "ru" });
            expect(result).toEqual([{ type: ChannelType.IN_APP, isVerified: true, soundEnabled: true, address: null }]);
        });

        it("[case] - rolls back both recipient and in-app channel on a duplicate account", async () => {
            // Arrange
            const account = randomUUID();
            const existing = await suite.fixtures().createRecipient({ account });
            const existingChannel = await suite.fixtures().createChannel({ recipient: existing, type: ChannelType.IN_APP });

            // Act
            const duplicate = suite.transaction(async (transaction) => {
                await Promise.resolve(
                    suite.repository().recipientService.create({
                        input: { account, timezone: "UTC", locale: "en-US" },
                        transaction,
                    }),
                );
            });
            await Promise.allSettled([duplicate]);
            const recipient = await loadRecipient(suite, account);
            const recipientId = recipient.id;
            const channelIds = recipient.channels.getItems().map(({ id }) => id);
            const recipientCount = await suite.transaction((transaction) => transaction.count(Recipient, { account }));

            // Assert
            await expect(duplicate).rejects.toThrow("recipient_account_unique");
            expect(recipientId).toBe(existing.id);
            expect(channelIds).toEqual([existingChannel.id]);
            expect(recipientCount).toBe(1);
        });
    });

    describe("[Method] - update", () => {
        it("[case] - updates only the recipient selected by account", async () => {
            // Arrange
            const target = await suite.fixtures().createRecipient({ timezone: "UTC", locale: "en-US" });
            const untouched = await suite.fixtures().createRecipient({ timezone: "Asia/Tokyo", locale: "ja" });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().recipientService.update({
                    input: {
                        patch: { timezone: "Europe/Moscow", locale: "ru" },
                        account: target.account,
                    },
                    transaction,
                }),
            );
            const persistedTarget = await loadRecipient(suite, target.account);
            const persistedUntouched = await loadRecipient(suite, untouched.account);

            // Assert
            expect({
                updatedAt: persistedTarget.updatedAt,
                timezone: persistedTarget.timezone,
                locale: persistedTarget.locale,
            }).toEqual({ timezone: "Europe/Moscow", locale: "ru", updatedAt: expect.any(Date) });
            expect({
                updatedAt: persistedUntouched.updatedAt,
                timezone: persistedUntouched.timezone,
                locale: persistedUntouched.locale,
            }).toEqual({ timezone: "Asia/Tokyo", locale: "ja", updatedAt: null });
        });
    });

    describe("[Method] - selectOtpChannel", () => {
        it.each([ChannelType.EMAIL, ChannelType.SMS])(
            "[case] - persists a verified owned %s channel as the otp default",
            async (type) => {
                // Arrange
                const recipient = await suite.fixtures().createRecipient();
                const channel = await suite.fixtures().createChannel({
                    sourceIdentifier: randomUUID(),
                    type,
                    isVerified: true,
                    recipient,
                });

                // Act
                await suite.transaction((transaction) =>
                    suite.repository().recipientService.selectOtpChannel({
                        input: { account: recipient.account, channel: channel.id },
                        transaction,
                    }),
                );
                const persisted = await loadRecipient(suite, recipient.account);

                // Assert
                expect({ id: persisted.defaultOtpChannel?.id, type: persisted.defaultOtpChannel?.type }).toEqual({
                    type,
                    id: channel.id,
                });
            },
        );

        it("[case] - rejects a verified channel owned by another recipient without changing the otp default", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const owner = await suite.fixtures().createRecipient();
            const foreignChannel = await suite.fixtures().createChannel({
                sourceIdentifier: randomUUID(),
                type: ChannelType.EMAIL,
                isVerified: true,
                recipient: owner,
            });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: {
                        account: recipient.account,
                        channel: foreignChannel.id,
                    },
                    transaction,
                }),
            );
            await Promise.allSettled([result]);
            const result1 = (await loadRecipient(suite, recipient.account)).defaultOtpChannel;

            // Assert
            await expect(result).rejects.toThrow("entities.recipient.NOT_OWN_CHANNEL");
            expect(result1).toBeNull();
        });

        it.each([
            {
                error: "entities.recipient.CHANNEL_NOT_VERIFIED",
                label: "an unverified email channel",
                type: ChannelType.EMAIL,
                isVerified: false,
            },
            {
                error: "entities.recipient.UNSUPPORTED_OTP_CHANNEL_TYPE",
                label: "an in-app channel",
                type: ChannelType.IN_APP,
                isVerified: true,
            },
        ])("[case] - rejects $label without changing the existing otp default", async ({ type, isVerified, error }) => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const currentDefault = await suite.fixtures().createChannel({
                sourceIdentifier: randomUUID(),
                type: ChannelType.SMS,
                isVerified: true,
                recipient,
            });
            const rejected = await suite.fixtures().createChannel({
                sourceIdentifier: randomUUID(),
                type,
                isVerified,
                recipient,
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: { account: recipient.account, channel: currentDefault.id },
                    transaction,
                }),
            );
            const result = suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: { account: recipient.account, channel: rejected.id },
                    transaction,
                }),
            );
            await Promise.allSettled([result]);
            const result1 = (await loadRecipient(suite, recipient.account)).defaultOtpChannel?.id;

            // Assert
            await expect(result).rejects.toThrow(error);
            expect(result1).toBe(currentDefault.id);
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - purges the recipient aggregate without touching another recipient", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const channel = await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });
            await suite.fixtures().createPreference({ recipient });
            const notification = await suite.fixtures().createNotification({ recipient });
            await suite.fixtures().createMessage({ notification, channel });
            const untouched = await suite.fixtures().createRecipient();
            const rowsBeforePurge = await countRecipientGraph(suite, recipient.id);

            // Act
            await suite.transaction((transaction) =>
                suite.repository().recipientService.purge({
                    input: { account: recipient.account },
                    transaction,
                }),
            );
            const rowsAfterPurge = await countRecipientGraph(suite, recipient.id);
            const remainingRecipientId = (await loadRecipient(suite, untouched.account)).id;

            // Assert
            expect(rowsBeforePurge).toBe(5);
            expect(rowsAfterPurge).toBe(0);
            expect(remainingRecipientId).toBe(untouched.id);
        });
    });
});
