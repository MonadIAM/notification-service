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

describe("ChannelService integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("creates an email channel with one disabled preference per configurable category", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const sourceIdentifier = randomUUID();

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

        expect(channel).toEqual(
            expect.objectContaining({
                recipient: expect.objectContaining({ id: recipient.id }),
                address: "integration@example.test",
                type: ChannelType.EMAIL,
                sourceIdentifier,
                isVerified: true,
            }),
        );
        expect(preferences).toHaveLength(CONFIGURABLE_NOTIFICATION_CATEGORIES.length);
        expect(preferences.map(({ category }) => category).sort()).toEqual(
            [...CONFIGURABLE_NOTIFICATION_CATEGORIES].sort(),
        );
        expect(preferences.every(({ channelType }) => channelType === ChannelType.EMAIL)).toBe(true);
        expect(preferences.every(({ isDuplicationEnabled }) => !isDuplicationEnabled)).toBe(true);
    });

    it("rolls back a duplicate email channel without adding preferences", async () => {
        const recipient = await suite.fixtures().createRecipient();

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

        await expect(
            suite.transaction((transaction) =>
                suite.repository().channelService.create({
                    input: {
                        address: "second@example.test",
                        account: recipient.account,
                        type: ChannelType.EMAIL,
                    },
                    transaction,
                }),
            ),
        ).rejects.toThrow("preference_recipient_channel_category_unique");

        await expect(
            suite.transaction((transaction) =>
                transaction.count(Channel, {
                    recipient: recipient.id,
                    type: ChannelType.EMAIL,
                }),
            ),
        ).resolves.toBe(1);
        await expect(loadPreferences(suite, recipient.id)).resolves.toHaveLength(
            CONFIGURABLE_NOTIFICATION_CATEGORIES.length,
        );
    });

    it("creates an sms channel without preferences", async () => {
        const recipient = await suite.fixtures().createRecipient();

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

        await expect(loadChannel(suite, created.id)).resolves.toEqual(
            expect.objectContaining({
                address: "+15550000001",
                type: ChannelType.SMS,
            }),
        );
        await expect(loadPreferences(suite, recipient.id)).resolves.toHaveLength(0);
    });

    it("persists channel verification", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const sourceIdentifier = randomUUID();
        const channel = await suite.fixtures().createChannel({ sourceIdentifier, isVerified: false, recipient });

        await suite.transaction((transaction) =>
            suite.repository().channelService.markVerified({
                input: { sourceIdentifier },
                transaction,
            }),
        );

        await expect(loadChannel(suite, channel.id)).resolves.toEqual(
            expect.objectContaining({
                verifiedAt: expect.any(Date),
                isVerified: true,
            }),
        );
    });

    it("toggles the persisted in-app sound through the populated channel collection", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const inApp = await suite.fixtures().createChannel({ recipient, type: ChannelType.IN_APP });
        await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });

        await suite.transaction((transaction) =>
            suite.repository().channelService.toggleSound({
                input: { account: recipient.account },
                transaction,
            }),
        );

        await expect(loadChannel(suite, inApp.id)).resolves.toEqual(
            expect.objectContaining({
                updatedAt: expect.any(Date),
                soundEnabled: false,
            }),
        );
    });

    it("throws the service error when the populated collection has no in-app channel", async () => {
        const recipient = await suite.fixtures().createRecipient();
        await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });

        await expect(
            suite.transaction((transaction) =>
                suite.repository().channelService.toggleSound({
                    input: { account: recipient.account },
                    transaction,
                }),
            ),
        ).rejects.toThrow("services.channel.IN_APP_CHANNEL_NOT_FOUND");
    });

    it("clears the otp default instead of deleting its channel", async () => {
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

        await suite.transaction((transaction) =>
            suite.repository().channelService.purge({
                input: { sourceIdentifier },
                transaction,
            }),
        );

        const persisted = await loadRecipient(suite, recipient.account);

        expect(persisted.defaultOtpChannel).toBeNull();
        expect(persisted.channels.getItems().map(({ id }) => id)).toContain(channel.id);
    });

    it("deletes a non-default channel and preserves related domain rows", async () => {
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

        await expect(loadChannel(suite, target.id)).resolves.toBeNull();
        expect(persisted.defaultOtpChannel?.id).toBe(otp.id);
        expect(persistedMessage.channel).toBeNull();
        await expect(
            suite.transaction((transaction) => transaction.count(Preference, { id: preference.id })),
        ).resolves.toBe(1);
        await expect(
            suite.transaction((transaction) => transaction.count(Notification, { id: notification.id })),
        ).resolves.toBe(1);
    });
});
