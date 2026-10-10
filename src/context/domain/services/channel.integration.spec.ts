import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";

import { Channel, Message, Notification, Preference, Recipient } from "~context/domain/entities";
import { ChannelIntegrationHelpers } from "~testing/integration/domain-service/channel.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { ChannelType } from "~context/enums";

const helpers = new ChannelIntegrationHelpers();

async function loadChannel(suite: Integration.Domain.Channel.Suite, id: string): Promise<Nullable<Entities.Channel>> {
    return await suite.transaction((transaction) => transaction.findOne(Channel, { id }, { populate: ["recipient"] }));
}

async function loadRecipient(suite: Integration.Domain.Channel.Suite, account: string): Promise<Entities.Recipient> {
    return await suite.transaction((transaction) =>
        transaction.findOneOrFail(Recipient, { account }, { populate: ["channels", "defaultOtpChannel"] }),
    );
}

async function loadPreferences(suite: Integration.Domain.Channel.Suite, recipient: string): Promise<Entities.Preference[]> {
    return await suite.transaction((transaction) =>
        transaction.find(Preference, { recipient }, { orderBy: { category: "asc" } }),
    );
}

describe("[DomainService] - Channel", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - create", () => {
        it("[case] - creates an email channel with one disabled preference per configurable category", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const sourceIdentifier = randomUUID();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().channelService.create({
                    input: {
                        address: "integration@example.test",
                        account: recipient.account,
                        type: ChannelType.EMAIL,
                        sourceIdentifier,
                        isVerified: true,
                    },
                    transaction,
                }),
            );
            const channel = await loadChannel(suite, created.id);
            const preferences = await loadPreferences(suite, recipient.id);
            const result = channel;
            const result1 = preferences;
            const result2 = preferences.map(({ category }) => category).sort();
            const result3 = preferences.every(({ channelType }) => channelType === ChannelType.EMAIL);
            const result4 = preferences.every(({ isDuplicationEnabled }) => !isDuplicationEnabled);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    recipient: expect.objectContaining({ id: recipient.id }),
                    address: "integration@example.test",
                    type: ChannelType.EMAIL,
                    sourceIdentifier,
                    isVerified: true,
                }),
            );
            expect(result1).toHaveLength(CONFIGURABLE_NOTIFICATION_CATEGORIES.length);
            expect(result2).toEqual([...CONFIGURABLE_NOTIFICATION_CATEGORIES].sort());
            expect(result3).toBe(true);
            expect(result4).toBe(true);
        });

        it("[case] - rolls back a duplicate email channel without adding preferences", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();

            // Act
            await suite.transaction((transaction) =>
                suite.repository().channelService.create({
                    input: {
                        address: "first@example.test",
                        account: recipient.account,
                        type: ChannelType.EMAIL,
                    },
                    transaction,
                }),
            );
            const result = suite.transaction((transaction) =>
                suite.repository().channelService.create({
                    input: {
                        address: "second@example.test",
                        account: recipient.account,
                        type: ChannelType.EMAIL,
                    },
                    transaction,
                }),
            );
            await Promise.allSettled([result]);
            const result1 = await suite.transaction((transaction) =>
                transaction.count(Channel, {
                    recipient: recipient.id,
                    type: ChannelType.EMAIL,
                }),
            );
            const result2 = await loadPreferences(suite, recipient.id);

            // Assert
            await expect(result).rejects.toThrow("preference_recipient_channel_category_unique");
            expect(result1).toBe(1);
            expect(result2).toHaveLength(CONFIGURABLE_NOTIFICATION_CATEGORIES.length);
        });

        it("[case] - creates an sms channel without preferences", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();

            // Act
            const created = await suite.transaction((transaction) =>
                suite.repository().channelService.create({
                    input: {
                        account: recipient.account,
                        address: "+15550000001",
                        type: ChannelType.SMS,
                    },
                    transaction,
                }),
            );
            const result = await loadChannel(suite, created.id);
            const result1 = await loadPreferences(suite, recipient.id);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    address: "+15550000001",
                    type: ChannelType.SMS,
                }),
            );
            expect(result1).toHaveLength(0);
        });
    });

    describe("[Method] - markVerified", () => {
        it("[case] - persists channel verification", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const sourceIdentifier = randomUUID();
            const channel = await suite.fixtures().createChannel({ sourceIdentifier, isVerified: false, recipient });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().channelService.markVerified({
                    input: { sourceIdentifier },
                    transaction,
                }),
            );
            const result = await loadChannel(suite, channel.id);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    verifiedAt: expect.any(Date),
                    isVerified: true,
                }),
            );
        });
    });

    describe("[Method] - toggleSound", () => {
        it("[case] - toggles the persisted in-app sound through the populated channel collection", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const inApp = await suite.fixtures().createChannel({ recipient, type: ChannelType.IN_APP });
            await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().channelService.toggleSound({
                    input: { account: recipient.account },
                    transaction,
                }),
            );
            const result = await loadChannel(suite, inApp.id);

            // Assert
            expect(result).toEqual(
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    soundEnabled: false,
                }),
            );
        });

        it("[case] - throws the service error when the populated collection has no in-app channel", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });

            // Act
            const result = suite.transaction((transaction) =>
                suite.repository().channelService.toggleSound({
                    input: { account: recipient.account },
                    transaction,
                }),
            );

            // Assert
            await expect(result).rejects.toThrow("services.channel.IN_APP_CHANNEL_NOT_FOUND");
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - clears the otp default instead of deleting its channel", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const sourceIdentifier = randomUUID();
            const channel = await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                sourceIdentifier,
                isVerified: true,
                recipient,
            });
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.findOneOrFail(Recipient, {
                    id: recipient.id,
                });
                persisted.defaultOtpChannel = transaction.getReference(Channel, channel.id);
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().channelService.purge({
                    input: { sourceIdentifier },
                    transaction,
                }),
            );
            const persisted = await loadRecipient(suite, recipient.account);
            const result = persisted.defaultOtpChannel;
            const result1 = persisted.channels.getItems().map(({ id }) => id);

            // Assert
            expect(result).toBeNull();
            expect(result1).toContain(channel.id);
        });

        it("[case] - deletes a non-default channel and preserves related domain rows", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const sourceIdentifier = randomUUID();
            const target = await suite.fixtures().createChannel({
                type: ChannelType.EMAIL,
                sourceIdentifier,
                recipient,
            });
            const otp = await suite.fixtures().createChannel({
                type: ChannelType.SMS,
                isVerified: true,
                recipient,
            });
            const preference = await suite.fixtures().createPreference({ recipient });
            const notification = await suite.fixtures().createNotification({ recipient });
            const message = await suite.fixtures().createMessage({ notification, channel: target });
            await suite.transaction(async (transaction) => {
                const persisted = await transaction.findOneOrFail(Recipient, {
                    id: recipient.id,
                });
                persisted.defaultOtpChannel = transaction.getReference(Channel, otp.id);
            });

            // Act
            await suite.transaction((transaction) =>
                suite.repository().channelService.purge({
                    input: { sourceIdentifier },
                    transaction,
                }),
            );
            const persisted = await loadRecipient(suite, recipient.account);
            const persistedMessage = await suite.transaction((transaction) =>
                transaction.findOneOrFail(Message, { id: message.id }, { populate: ["channel"] }),
            );
            const result = await loadChannel(suite, target.id);
            const result1 = persisted.defaultOtpChannel?.id;
            const result2 = persistedMessage.channel;
            const result3 = await suite.transaction((transaction) => transaction.count(Preference, { id: preference.id }));
            const result4 = await suite.transaction((transaction) =>
                transaction.count(Notification, { id: notification.id }),
            );

            // Assert
            expect(result).toBeNull();
            expect(result1).toBe(otp.id);
            expect(result2).toBeNull();
            expect(result3).toBe(1);
            expect(result4).toBe(1);
        });
    });
});
