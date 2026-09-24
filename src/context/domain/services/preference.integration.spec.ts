import { describe, expect, it } from "@jest/globals";

import { PreferenceIntegrationHelpers } from "~testing/integration/domain-service/preference.helpers";
import { postgresSuite } from "~testing/integration/containers/postgres.suite";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { NotificationCategory, ChannelType } from "~context/enums";
import { Preference } from "~context/domain/entities";

const helpers = new PreferenceIntegrationHelpers();

async function loadPreferences(
    suite: Integration.Domain.Preference.Suite,
    recipient: string,
): Promise<Entities.Preference[]> {
    return await suite.transaction((transaction) => transaction.find(Preference, { recipient }));
}

describe("PreferenceService integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("lazily creates a disabled configurable preference", async () => {
        const recipient = await suite.fixtures().createRecipient();

        const created = await suite.transaction((transaction) =>
            suite.repository().preferenceService.toggle({
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    account: recipient.account,
                },
                transaction,
            }),
        );

        const preferences = await loadPreferences(suite, recipient.id);

        expect(preferences).toEqual([
            expect.objectContaining({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                id: created.id,
            }),
        ]);
    });

    it("toggles the existing row without creating a duplicate", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const existing = await suite.fixtures().createPreference({
            category: NotificationCategory.SYSTEM,
            channelType: ChannelType.EMAIL,
            isDuplicationEnabled: false,
            recipient,
        });

        await suite.transaction((transaction) =>
            suite.repository().preferenceService.toggle({
                input: {
                    category: NotificationCategory.SYSTEM,
                    channelType: ChannelType.EMAIL,
                    account: recipient.account,
                },
                transaction,
            }),
        );

        let preferences = await loadPreferences(suite, recipient.id);

        expect(preferences).toEqual([
            expect.objectContaining({
                updatedAt: expect.any(Date),
                isDuplicationEnabled: true,
                id: existing.id,
            }),
        ]);

        await suite.transaction((transaction) =>
            suite.repository().preferenceService.toggle({
                input: {
                    category: NotificationCategory.SYSTEM,
                    channelType: ChannelType.EMAIL,
                    account: recipient.account,
                },
                transaction,
            }),
        );

        preferences = await loadPreferences(suite, recipient.id);

        expect(preferences).toEqual([
            expect.objectContaining({
                isDuplicationEnabled: false,
                id: existing.id,
            }),
        ]);
    });

    it("rolls back a duplicate preference created through the service", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const existing = await suite.fixtures().createPreference({
            category: NotificationCategory.OTHER,
            channelType: ChannelType.EMAIL,
            recipient,
        });

        await expect(
            suite.transaction(async (transaction) => {
                await Promise.resolve(
                    suite.repository().preferenceService.create({
                        input: {
                            category: NotificationCategory.OTHER,
                            channelType: ChannelType.EMAIL,
                            isDuplicationEnabled: false,
                            recipient,
                        },
                        transaction,
                    }),
                );
            }),
        ).rejects.toThrow("preference_recipient_channel_category_unique");

        await expect(loadPreferences(suite, recipient.id)).resolves.toEqual([expect.objectContaining({ id: existing.id })]);
    });
});
