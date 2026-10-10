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

describe("[DomainService] - Preference", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    describe("[Method] - toggle", () => {
        it("[case] - lazily creates a disabled configurable preference", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();

            // Act
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

            // Assert
            expect(preferences).toEqual([
                expect.objectContaining({
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    isDuplicationEnabled: false,
                    id: created.id,
                }),
            ]);
        });

        it("[case] - toggles the existing row without creating a duplicate", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const existing = await suite.fixtures().createPreference({
                category: NotificationCategory.SYSTEM,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                recipient,
            });

            // Act
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
            const enabledPreferences = await loadPreferences(suite, recipient.id);
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
            const disabledPreferences = await loadPreferences(suite, recipient.id);

            // Assert
            expect(enabledPreferences).toEqual([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    isDuplicationEnabled: true,
                    id: existing.id,
                }),
            ]);
            expect(disabledPreferences).toEqual([
                expect.objectContaining({
                    isDuplicationEnabled: false,
                    id: existing.id,
                }),
            ]);
        });
    });

    describe("[Method] - create", () => {
        it("[case] - rolls back a duplicate preference created through the service", async () => {
            // Arrange
            const recipient = await suite.fixtures().createRecipient();
            const existing = await suite.fixtures().createPreference({
                category: NotificationCategory.OTHER,
                channelType: ChannelType.EMAIL,
                recipient,
            });

            // Act
            const result = suite.transaction(async (transaction) => {
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
            });
            await Promise.allSettled([result]);
            const result1 = await loadPreferences(suite, recipient.id);

            // Assert
            await expect(result).rejects.toThrow("preference_recipient_channel_category_unique");
            expect(result1).toEqual([expect.objectContaining({ id: existing.id })]);
        });
    });
});
