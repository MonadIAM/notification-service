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

describe("RecipientService integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("creates a persisted recipient with a verified in-app channel", async () => {
        const account = randomUUID();

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

        expect({
            id: recipient.id,
            account: recipient.account,
            timezone: recipient.timezone,
            locale: recipient.locale,
        }).toEqual({ id: created.id, account, timezone: "Europe/Moscow", locale: "ru" });
        expect(
            recipient.channels.getItems().map(({ type, isVerified, soundEnabled, address }) => ({
                soundEnabled,
                isVerified,
                address,
                type,
            })),
        ).toEqual([{ type: ChannelType.IN_APP, isVerified: true, soundEnabled: true, address: null }]);
    });

    it("rolls back both recipient and in-app channel on a duplicate account", async () => {
        const account = randomUUID();
        const existing = await suite.fixtures().createRecipient({ account });
        const existingChannel = await suite.fixtures().createChannel({ recipient: existing, type: ChannelType.IN_APP });

        await expect(
            suite.transaction(async (transaction) => {
                await Promise.resolve(
                    suite.repository().recipientService.create({
                        input: { account, timezone: "UTC", locale: "en-US" },
                        transaction,
                    }),
                );
            }),
        ).rejects.toThrow("recipient_account_unique");

        const recipient = await loadRecipient(suite, account);

        expect(recipient.id).toBe(existing.id);
        expect(recipient.channels.getItems().map(({ id }) => id)).toEqual([existingChannel.id]);
        await expect(suite.transaction((transaction) => transaction.count(Recipient, { account }))).resolves.toBe(1);
    });

    it("updates only the recipient selected by account", async () => {
        const target = await suite.fixtures().createRecipient({ timezone: "UTC", locale: "en-US" });
        const untouched = await suite.fixtures().createRecipient({ timezone: "Asia/Tokyo", locale: "ja" });

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

    it.each([ChannelType.EMAIL, ChannelType.SMS])(
        "persists a verified owned %s channel as the otp default",
        async (type) => {
            const recipient = await suite.fixtures().createRecipient();
            const channel = await suite.fixtures().createChannel({
                sourceIdentifier: randomUUID(),
                type,
                isVerified: true,
                recipient,
            });

            await suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: { account: recipient.account, channel: channel.id },
                    transaction,
                }),
            );

            const persisted = await loadRecipient(suite, recipient.account);

            expect({ id: persisted.defaultOtpChannel?.id, type: persisted.defaultOtpChannel?.type }).toEqual({
                type,
                id: channel.id,
            });
        },
    );

    it("rejects a verified channel owned by another recipient without changing the otp default", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const owner = await suite.fixtures().createRecipient();
        const foreignChannel = await suite.fixtures().createChannel({
            sourceIdentifier: randomUUID(),
            type: ChannelType.EMAIL,
            isVerified: true,
            recipient: owner,
        });

        await expect(
            suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: {
                        account: recipient.account,
                        channel: foreignChannel.id,
                    },
                    transaction,
                }),
            ),
        ).rejects.toThrow("entities.recipient.NOT_OWN_CHANNEL");

        expect((await loadRecipient(suite, recipient.account)).defaultOtpChannel).toBeNull();
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
    ])("rejects $label without changing the existing otp default", async ({ type, isVerified, error }) => {
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

        await suite.transaction((transaction) =>
            suite.repository().recipientService.selectOtpChannel({
                input: { account: recipient.account, channel: currentDefault.id },
                transaction,
            }),
        );

        await expect(
            suite.transaction((transaction) =>
                suite.repository().recipientService.selectOtpChannel({
                    input: { account: recipient.account, channel: rejected.id },
                    transaction,
                }),
            ),
        ).rejects.toThrow(error);

        expect((await loadRecipient(suite, recipient.account)).defaultOtpChannel?.id).toBe(currentDefault.id);
    });

    it("purges the recipient aggregate without touching another recipient", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const channel = await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });
        await suite.fixtures().createPreference({ recipient });
        const notification = await suite.fixtures().createNotification({ recipient });
        await suite.fixtures().createMessage({ notification, channel });
        const untouched = await suite.fixtures().createRecipient();

        await expect(countRecipientGraph(suite, recipient.id)).resolves.toBe(5);

        await suite.transaction((transaction) =>
            suite.repository().recipientService.purge({
                input: { account: recipient.account },
                transaction,
            }),
        );

        await expect(countRecipientGraph(suite, recipient.id)).resolves.toBe(0);
        expect((await loadRecipient(suite, untouched.account)).id).toBe(untouched.id);
    });
});
