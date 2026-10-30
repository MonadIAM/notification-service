import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { PreferenceUnitHelpers } from "~testing/unit/domain-service/preference.helpers";
import { NotificationCategory, ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-400000000001";

const helpers = new PreferenceUnitHelpers();

describe("[DomainService] - Preference", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - creates a preference and persists it", () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = service.create({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    isDuplicationEnabled: true,
                    recipient,
                },
            });
            const result1 = result;

            // Assert
            expect(result1).toEqual(
                expect.objectContaining({
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    isDuplicationEnabled: true,
                    recipient,
                }),
            );
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Method] - toggle", () => {
        it.each([
            {
                category: NotificationCategory.SECURITY,
                channelType: ChannelType.EMAIL,
                error: "CATEGORY_NOT_CONFIGURABLE",
            },
            {
                category: NotificationCategory.INVITES,
                channelType: ChannelType.IN_APP,
                error: "CHANNEL_NOT_CONFIGURABLE",
            },
        ])(
            "[case] - rejects $category/$channelType with $error before loading the recipient",
            async ({ category, channelType, error }) => {
                // Arrange
                const { service, repositories, transaction } = helpers.service();

                // Act
                const result = service.toggle({
                    transaction: transaction.entityManager,
                    input: { category, channelType, account: ACCOUNT_ID },
                });
                await Promise.allSettled([result]);

                // Assert
                await expect(result).rejects.toThrow(`services.preference.${error}`);
                expect(repositories.recipients.findUniqueOrThrow).not.toHaveBeenCalled();
            },
        );

        it("[case] - toggles an existing preference and returns it", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({
                recipient,
                type: ChannelType.EMAIL,
                isVerified: true,
                sourceIdentifier: ACCOUNT_ID,
                address: "verified@example.test",
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const existing = helpers.createPreference({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                recipient,
            });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const toggleSpy = jest.spyOn(existing, "toggle");
            repositories.preferences.findUnique.mockImplementation(() => Promise.resolve(existing));

            // Act
            const result = await service.toggle({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    account: ACCOUNT_ID,
                },
            });
            const result1 = repositories.preferences.findUnique;
            const result2 = toggleSpy;
            const result3 = result;

            // Assert
            expect(result1).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    recipient: recipient.id,
                },
            });
            expect(result2).toHaveBeenCalledTimes(1);
            expect(result3).toBe(existing);
            expect(transaction.persist).not.toHaveBeenCalled();
        });

        it("[case] - lazily creates a disabled preference when none exists yet", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({
                recipient,
                type: ChannelType.EMAIL,
                isVerified: true,
                sourceIdentifier: ACCOUNT_ID,
                address: "verified@example.test",
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.toggle({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    account: ACCOUNT_ID,
                },
            });
            const result1 = result;

            // Assert
            expect(result1).toEqual(
                expect.objectContaining({
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    isDuplicationEnabled: false,
                    recipient,
                }),
            );
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Behavior] - unavailable delivery channel", () => {
        it.each(["missing", "unverified", "unbound", "addressless"] as const)(
            "[case] - rejects changes for a %s channel",
            async (state) => {
                // Arrange
                const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
                if (state !== "missing") {
                    const channel = helpers.createChannel({
                        recipient,
                        type: ChannelType.EMAIL,
                        isVerified: state !== "unverified",
                        sourceIdentifier: state === "unbound" ? undefined : ACCOUNT_ID,
                        address: state === "addressless" ? undefined : "valid@example.test",
                    });
                    recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
                }
                const { service, repositories, transaction } = helpers.service({ recipient });

                // Act
                const result = service.toggle({
                    input: { account: ACCOUNT_ID, channelType: ChannelType.EMAIL, category: NotificationCategory.INVITES },
                    transaction: transaction.entityManager,
                });

                // Assert
                await expect(result).rejects.toThrow("services.preference.CHANNEL_UNAVAILABLE");
                expect(repositories.preferences.findUnique).not.toHaveBeenCalled();
                expect(transaction.persist).not.toHaveBeenCalled();
            },
        );
    });
});
