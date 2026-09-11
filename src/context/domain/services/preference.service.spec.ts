import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { PreferenceUnitHelpers } from "~testing/unit/domain-service/preference.helpers";
import { NotificationCategory, ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-400000000001";

const helpers = new PreferenceUnitHelpers();

describe("PreferenceService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create", () => {
        it("creates a preference and persists it", () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, transaction } = helpers.service({ recipient });

            const result = service.create({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    isDuplicationEnabled: true,
                    recipient,
                },
            });

            expect(result).toEqual(
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

    describe("toggle", () => {
        it("throws for a category that is not configurable", async () => {
            const { service, repositories, transaction } = helpers.service();

            await expect(
                service.toggle({
                    transaction: transaction.entityManager,
                    input: {
                        category: NotificationCategory.SECURITY,
                        channelType: ChannelType.EMAIL,
                        account: ACCOUNT_ID,
                    },
                }),
            ).rejects.toThrow("services.preference.CATEGORY_NOT_CONFIGURABLE");

            expect(repositories.recipients.findUniqueOrThrow).not.toHaveBeenCalled();
        });

        it("throws for a channel type that cannot be duplicated", async () => {
            const { service, repositories, transaction } = helpers.service();

            await expect(
                service.toggle({
                    transaction: transaction.entityManager,
                    input: {
                        category: NotificationCategory.INVITES,
                        channelType: ChannelType.IN_APP,
                        account: ACCOUNT_ID,
                    },
                }),
            ).rejects.toThrow("services.preference.CHANNEL_NOT_CONFIGURABLE");

            expect(repositories.recipients.findUniqueOrThrow).not.toHaveBeenCalled();
        });

        it("toggles an existing preference and returns it", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const existing = helpers.createPreference({
                category: NotificationCategory.INVITES,
                channelType: ChannelType.EMAIL,
                isDuplicationEnabled: false,
                recipient,
            });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const toggleSpy = jest.spyOn(existing, "toggle");
            repositories.preferences.findUnique.mockImplementation(() => Promise.resolve(existing));

            const result = await service.toggle({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    account: ACCOUNT_ID,
                },
            });

            expect(repositories.preferences.findUnique).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    recipient: recipient.id,
                },
            });
            expect(toggleSpy).toHaveBeenCalledTimes(1);
            expect(result).toBe(existing);
            expect(transaction.persist).not.toHaveBeenCalled();
        });

        it("lazily creates a disabled preference when none exists yet", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, transaction } = helpers.service({ recipient });

            const result = await service.toggle({
                transaction: transaction.entityManager,
                input: {
                    category: NotificationCategory.INVITES,
                    channelType: ChannelType.EMAIL,
                    account: ACCOUNT_ID,
                },
            });

            expect(result).toEqual(
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
});
