import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { RecipientUnitHelpers } from "~testing/unit/domain-service/recipient.helpers";
import { ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-500000000001";
const CHANNEL_ID = "00000000-0000-4000-8000-500000000002";

const helpers = new RecipientUnitHelpers();

describe("[DomainService] - Recipient", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - persists the recipient together with a verified in-app channel", () => {
            // Arrange
            const { service, transaction } = helpers.service();

            // Act
            const result = service.create({
                input: { account: ACCOUNT_ID, timezone: "Europe/Moscow", locale: "ru" },
                transaction: transaction.entityManager,
            });
            const result1 = result;
            const result2 = transaction.persist;

            // Assert
            expect(result1).toEqual(
                expect.objectContaining({
                    timezone: "Europe/Moscow",
                    account: ACCOUNT_ID,
                    locale: "ru",
                }),
            );
            expect(result2).toHaveBeenNthCalledWith(1, result);
            expect(transaction.persist).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    type: ChannelType.IN_APP,
                    recipient: result,
                    isVerified: true,
                }),
            );
        });
    });

    describe("[Method] - update", () => {
        it("[case] - finds the recipient by account and applies the patch", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const updateSpy = jest.spyOn(recipient, "update");

            // Act
            const result = await service.update({
                input: { account: ACCOUNT_ID, patch: { locale: "en" } },
                transaction: transaction.entityManager,
            });
            const result1 = repositories.recipients.findUniqueOrThrow;
            const result2 = updateSpy;

            // Assert
            expect(result1).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(result2).toHaveBeenCalledWith({ patch: { locale: "en" } });
            expect(result).toBe(recipient);
        });
    });

    describe("[Method] - selectOtpChannel", () => {
        it("[case] - loads the recipient and channel and links them as the otp default", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const selectSpy = jest.spyOn(recipient, "selectOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            // Act
            const result = await service.selectOtpChannel({
                input: { account: ACCOUNT_ID, channel: CHANNEL_ID },
                transaction: transaction.entityManager,
            });
            const result1 = repositories.channels.findUniqueOrThrow;
            const result2 = selectSpy;
            const result3 = selectSpy.mock.calls[0][0];

            // Assert
            expect(result1).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                options: { populate: ["recipient"] },
                where: { id: CHANNEL_ID },
            });
            expect(result2).toHaveBeenCalledTimes(1);
            expect(result3).toBe(channel);
            expect(result).toBe(recipient);
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - finds the recipient by account and removes it", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            // Act
            await service.purge({
                transaction: transaction.entityManager,
                input: { account: ACCOUNT_ID },
            });
            const result = repositories.recipients.findUnique;

            // Assert
            expect(result).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(transaction.remove).toHaveBeenCalledWith(recipient);
        });

        it("[case] - accepts repeated deletion when the recipient is absent", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(null));

            // Act
            await service.purge({ input: { account: ACCOUNT_ID }, transaction: transaction.entityManager });

            // Assert
            expect(transaction.remove).not.toHaveBeenCalled();
        });
    });

    describe("[Method] - ensure", () => {
        it("[case] - reuses an existing recipient without changing their settings", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID, locale: "ru", timezone: "Europe/Moscow" });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            // Act
            const result = await service.ensure({
                input: { account: ACCOUNT_ID, locale: "en", timezone: "UTC" },
                transaction: transaction.entityManager,
            });
            const result1 = transaction.persist;

            // Assert
            expect(result).toBe(recipient);
            expect(result1).not.toHaveBeenCalled();
            expect(recipient.locale).toBe("ru");
        });

        it("[case] - creates the missing recipient and in-app channel", async () => {
            // Arrange
            const { service, repositories, transaction } = helpers.service();
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(null));

            // Act
            const recipient = await service.ensure({
                input: { account: ACCOUNT_ID, locale: "en", timezone: "UTC" },
                transaction: transaction.entityManager,
            });
            const result = transaction.persist;

            // Assert
            expect(result).toHaveBeenCalledWith(expect.objectContaining({ recipient, type: ChannelType.IN_APP }));
            expect(transaction.persist).toHaveBeenCalledTimes(2);
        });
    });

    describe("[Method] - ensureChannel", () => {
        it("[case] - confirms the existing channel without a flush or recreating the recipient", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({
                recipient,
                type: ChannelType.EMAIL,
                sourceIdentifier: "identifier-id",
                address: "user@example.test",
                isVerified: false,
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            repositories.recipients.findUnique.mockImplementation(() => Promise.resolve(recipient));

            // Act
            const result = await service.ensureChannel({
                input: {
                    account: ACCOUNT_ID,
                    sourceIdentifier: "identifier-id",
                    address: "user@example.test",
                    type: ChannelType.EMAIL,
                    isVerified: true,
                },
                transaction: transaction.entityManager,
            });
            const result1 = result;
            const result2 = channel.isVerified;
            const result3 = repositories.recipients.findUnique;
            const result4 = transaction.flush;

            // Assert
            expect(result1).toEqual({ recipient, channel });
            expect(result2).toBe(true);
            expect(result3).toHaveBeenCalledWith({
                options: { populate: ["channels"] },
                where: { account: ACCOUNT_ID },
                transaction: transaction.entityManager,
            });
            expect(result4).not.toHaveBeenCalled();
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
