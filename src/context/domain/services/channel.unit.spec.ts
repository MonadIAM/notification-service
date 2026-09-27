import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { CONFIGURABLE_NOTIFICATION_CATEGORIES } from "~context/constants";
import { ChannelUnitHelpers } from "~testing/unit/domain-service/channel.helpers";
import { ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-100000000001";
const CHANNEL_ID = "00000000-0000-4000-8000-100000000002";
const SECOND_CHANNEL_ID = "00000000-0000-4000-8000-100000000003";
const SOURCE_IDENTIFIER = "00000000-0000-4000-8000-100000000004";

const helpers = new ChannelUnitHelpers();

describe("ChannelService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create", () => {
        it("creates a duplicatable channel with a disabled preference per configurable category", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });

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

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { account: ACCOUNT_ID },
                transaction: transaction.entityManager,
            });
            expect(result).toEqual(
                expect.objectContaining({
                    sourceIdentifier: SOURCE_IDENTIFIER,
                    address: "user@example.com",
                    type: ChannelType.EMAIL,
                    recipient,
                }),
            );
            expect(transaction.persist).toHaveBeenNthCalledWith(1, result);
            expect(transaction.persist).toHaveBeenCalledTimes(1 + CONFIGURABLE_NOTIFICATION_CATEGORIES.length);

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

        it("creates a non-duplicatable channel without any preference", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, transaction } = helpers.service({ recipient });

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

            expect(transaction.persist).toHaveBeenCalledTimes(1);
            expect(transaction.persist).toHaveBeenCalledWith(result);
        });
    });

    describe("markVerified", () => {
        it("finds the channel by its source identifier and marks it verified", async () => {
            const channel = helpers.createChannel({ id: CHANNEL_ID, isVerified: false });
            const { service, repositories, transaction } = helpers.service();
            const markVerifiedSpy = jest.spyOn(channel, "markVerified");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            await service.markVerified({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });

            expect(repositories.channels.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            expect(markVerifiedSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("toggleSound", () => {
        it("toggles the sound of the in-app channel of the recipient", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const inApp = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            const email = helpers.createChannel({ id: SECOND_CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.channels = helpers.collection({ owner: recipient, items: [email, inApp] });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const toggleSpy = jest.spyOn(inApp, "toggleSound");

            const result = await service.toggleSound({
                transaction: transaction.entityManager,
                input: { account: ACCOUNT_ID },
            });

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                options: { populate: ["channels"] },
                where: { account: ACCOUNT_ID },
            });
            expect(toggleSpy).toHaveBeenCalledTimes(1);
            expect(result).toBe(inApp);
        });

        it("throws when the recipient has no in-app channel", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const email = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.channels = helpers.collection({ owner: recipient, items: [email] });
            const { service, transaction } = helpers.service({ recipient });

            await expect(
                service.toggleSound({
                    transaction: transaction.entityManager,
                    input: { account: ACCOUNT_ID },
                }),
            ).rejects.toThrow("services.channel.IN_APP_CHANNEL_NOT_FOUND");
        });
    });

    describe("purge", () => {
        it("clears the otp selection instead of removing the default otp channel", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            recipient.defaultOtpChannel = channel;
            const { service, repositories, transaction } = helpers.service({ recipient });
            const clearSpy = jest.spyOn(recipient, "clearOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            await service.purge({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });

            expect(repositories.channels.findUniqueOrThrow).toHaveBeenCalledWith({
                options: { populate: ["recipient", "recipient.defaultOtpChannel"] },
                where: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });
            expect(clearSpy).toHaveBeenCalledTimes(1);
            expect(transaction.remove).not.toHaveBeenCalled();
        });

        it("removes a channel that is not the default otp channel", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            const otpChannel = helpers.createChannel({ id: SECOND_CHANNEL_ID, recipient, type: ChannelType.SMS });
            recipient.defaultOtpChannel = otpChannel;
            const { service, repositories, transaction } = helpers.service({ recipient });
            const clearSpy = jest.spyOn(recipient, "clearOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            await service.purge({
                input: { sourceIdentifier: SOURCE_IDENTIFIER },
                transaction: transaction.entityManager,
            });

            expect(clearSpy).not.toHaveBeenCalled();
            expect(transaction.remove).toHaveBeenCalledWith(channel);
        });
    });

    describe("ensure", () => {
        it("reuses a channel on resend and confirms it idempotently", () => {
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

            expect(service.ensure({ input, transaction: transaction.entityManager })).toBe(channel);
            expect(channel.isVerified).toBe(false);
            service.ensure({ input: { ...input, isVerified: true }, transaction: transaction.entityManager });
            service.ensure({ input: { ...input, isVerified: true }, transaction: transaction.entityManager });
            expect(channel.isVerified).toBe(true);
            expect(transaction.persist).not.toHaveBeenCalled();
        });

        it("rejects an identifier that conflicts with the existing channel", () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            recipient.channels = helpers.collection({
                owner: recipient,
                items: [helpers.createChannel({ recipient, sourceIdentifier: SOURCE_IDENTIFIER, type: ChannelType.EMAIL })],
            });
            const { service, transaction } = helpers.service({ recipient });

            expect(() =>
                service.ensure({
                    input: {
                        recipient,
                        sourceIdentifier: SECOND_CHANNEL_ID,
                        type: ChannelType.EMAIL,
                        address: "other@example.test",
                    },
                    transaction: transaction.entityManager,
                }),
            ).toThrow("services.channel.IDENTIFIER_MISMATCH");
            expect(transaction.persist).not.toHaveBeenCalled();
        });
    });
});
