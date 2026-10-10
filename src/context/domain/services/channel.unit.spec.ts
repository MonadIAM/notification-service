import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { ChannelUnitHelpers } from "~testing/unit/domain-service/channel.helpers";
import { ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-100000000001";
const CHANNEL_ID = "00000000-0000-4000-8000-100000000002";
const SECOND_CHANNEL_ID = "00000000-0000-4000-8000-100000000003";
const SOURCE_IDENTIFIER = "00000000-0000-4000-8000-100000000004";

const helpers = new ChannelUnitHelpers();

describe("[DomainService] - Channel", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - create", () => {
        it("[case] - creates a duplicatable channel with a disabled preference per configurable category", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({
                transaction: transaction.entityManager,
                input: {
                    sourceIdentifier: SOURCE_IDENTIFIER,
                    address: "user@example.com",
                    type: ChannelType.EMAIL,
                    account: ACCOUNT_ID,
                    isVerified: false,
                },
            });
            const result1 = repositories.recipients.findUniqueOrThrow;
            const result2 = result;
            const result3 = transaction.persist;
            const result4 = transaction.persist;

            // Assert
            expect(result1).toHaveBeenCalledWith({
                where: { account: ACCOUNT_ID },
                transaction: transaction.entityManager,
            });
            expect(result2).toEqual(
                expect.objectContaining({
                    sourceIdentifier: SOURCE_IDENTIFIER,
                    address: "user@example.com",
                    type: ChannelType.EMAIL,
                    recipient,
                }),
            );
            expect(result3).toHaveBeenNthCalledWith(1, result);
            expect(result4).toHaveBeenCalledTimes(1 + CONFIGURABLE_NOTIFICATION_CATEGORIES.length);
            for (const [index, category] of CONFIGURABLE_NOTIFICATION_CATEGORIES.entries()) {
                expect(transaction.persist).toHaveBeenNthCalledWith(
                    index + 2,
                    expect.objectContaining({
                        channelType: ChannelType.EMAIL,
                        isDuplicationEnabled: false,
                        recipient,
                        category,
                    }),
                );
            }
        });

        it("[case] - creates a non-duplicatable channel without any preference", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = await service.create({
                transaction: transaction.entityManager,
                input: {
                    sourceIdentifier: SOURCE_IDENTIFIER,
                    address: "+70000000000",
                    type: ChannelType.SMS,
                    account: ACCOUNT_ID,
                    isVerified: false,
                },
            });
            const result1 = transaction.persist;

            // Assert
            expect(result1).toHaveBeenCalledTimes(1);
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("[Method] - markVerified", () => {
        it("[case] - finds the channel by its source identifier and marks it verified", async () => {
            // Arrange
            const channel = helpers.createChannel({ id: CHANNEL_ID, isVerified: false });
            const { service, repositories, transaction } = helpers.service();
            const markVerifiedSpy = jest.spyOn(channel, "markVerified");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            // Act
            await service.markVerified({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            const result = repositories.channels.findUniqueOrThrow;

            // Assert
            expect(result).toHaveBeenCalledWith({
                where: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            expect(markVerifiedSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("[Method] - toggleSound", () => {
        it("[case] - toggles the sound of the in-app channel of the recipient", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const inApp = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            const email = helpers.createChannel({ id: SECOND_CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.channels = helpers.collection({ owner: recipient, items: [email, inApp] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const toggleSpy = jest.spyOn(inApp, "toggleSound");

            // Act
            const result = await service.toggleSound({
                transaction: transaction.entityManager,
                input: { account: ACCOUNT_ID },
            });
            const result1 = repositories.recipients.findUniqueOrThrow;
            const result2 = toggleSpy;

            // Assert
            expect(result1).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                options: { populate: ["channels"] },
                where: { account: ACCOUNT_ID },
            });
            expect(result2).toHaveBeenCalledTimes(1);
            expect(result).toBe(inApp);
        });

        it("[case] - throws when the recipient has no in-app channel", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const email = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.channels = helpers.collection({ owner: recipient, items: [email] });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const result = service.toggleSound({
                transaction: transaction.entityManager,
                input: { account: ACCOUNT_ID },
            });

            // Assert
            await expect(result).rejects.toThrow("services.channel.IN_APP_CHANNEL_NOT_FOUND");
        });
    });

    describe("[Method] - purge", () => {
        it("[case] - clears the otp selection instead of removing the default otp channel", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.defaultOtpChannel = channel;
            const { service, repositories, transaction } = helpers.service({ recipient });
            const clearSpy = jest.spyOn(recipient, "clearOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            // Act
            await service.purge({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            const result = repositories.channels.findUniqueOrThrow;
            const result1 = clearSpy;

            // Assert
            expect(result).toHaveBeenCalledWith({
                options: { populate: ["recipient", "recipient.defaultOtpChannel"] },
                where: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            expect(result1).toHaveBeenCalledTimes(1);
            expect(transaction.remove).not.toHaveBeenCalled();
        });

        it("[case] - removes a channel that is not the default otp channel", async () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            const otpChannel = helpers.createChannel({ id: SECOND_CHANNEL_ID, recipient, type: ChannelType.SMS });
            recipient.defaultOtpChannel = otpChannel;
            const { service, repositories, transaction } = helpers.service({ recipient });
            const clearSpy = jest.spyOn(recipient, "clearOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            // Act
            await service.purge({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            const result = clearSpy;

            // Assert
            expect(result).not.toHaveBeenCalled();
            expect(transaction.remove).toHaveBeenCalledWith(channel);
        });
    });

    describe("[Method] - ensure", () => {
        it("[case] - reuses a channel on resend and confirms it idempotently", () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({
                recipient,
                sourceIdentifier: SOURCE_IDENTIFIER,
                address: "user@example.test",
                type: ChannelType.EMAIL,
                isVerified: false,
            });
            const { service, transaction } = helpers.service({ recipient });
            recipient.channels = helpers.collection({ owner: recipient, items: [channel] });
            const input = {
                recipient,
                sourceIdentifier: SOURCE_IDENTIFIER,
                address: channel.address,
                type: channel.type,
            };

            // Act
            const reused = service.ensure({ input, transaction: transaction.entityManager });
            const verifiedBeforeConfirmation = channel.isVerified;
            service.ensure({ input: { ...input, isVerified: true }, transaction: transaction.entityManager });
            service.ensure({ input: { ...input, isVerified: true }, transaction: transaction.entityManager });
            const verifiedAfterConfirmation = channel.isVerified;

            // Assert
            expect(reused).toBe(channel);
            expect(verifiedBeforeConfirmation).toBe(false);
            expect(verifiedAfterConfirmation).toBe(true);
            expect(transaction.persist).not.toHaveBeenCalled();
        });

        it("[case] - rejects an identifier that conflicts with the existing channel", () => {
            // Arrange
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            recipient.channels = helpers.collection({
                owner: recipient,
                items: [helpers.createChannel({ recipient, sourceIdentifier: SOURCE_IDENTIFIER, type: ChannelType.EMAIL })],
            });
            const { service, transaction } = helpers.service({ recipient });

            // Act
            const act = (): unknown =>
                service.ensure({
                    input: {
                        recipient,
                        sourceIdentifier: SECOND_CHANNEL_ID,
                        type: ChannelType.EMAIL,
                        address: "other@example.test",
                    },
                    transaction: transaction.entityManager,
                });

            // Assert
            expect(act).toThrow("services.channel.IDENTIFIER_MISMATCH");
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
