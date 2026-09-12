import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { RecipientUnitHelpers } from "~testing/unit/domain-service/recipient.helpers";
import { ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-500000000001";
const CHANNEL_ID = "00000000-0000-4000-8000-500000000002";

const helpers = new RecipientUnitHelpers();

describe("RecipientService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create", () => {
        it("persists the recipient together with a verified in-app channel", () => {
            const { service, transaction } = helpers.service();

            const result = service.create({
                input: { account: ACCOUNT_ID, timezone: "Europe/Moscow", locale: "ru" },
                transaction: transaction.entityManager,
            });

            expect(result).toEqual(
                expect.objectContaining({
                    timezone: "Europe/Moscow",
                    account: ACCOUNT_ID,
                    locale: "ru",
                }),
            );
            expect(transaction.persist).toHaveBeenNthCalledWith(1, result);
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

    describe("update", () => {
        it("finds the recipient by account and applies the patch", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const updateSpy = jest.spyOn(recipient, "update");

            const result = await service.update({
                input: { account: ACCOUNT_ID, patch: { locale: "en" } },
                transaction: transaction.entityManager,
            });

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(updateSpy).toHaveBeenCalledWith({ patch: { locale: "en" } });
            expect(result).toBe(recipient);
        });
    });

    describe("selectOtpChannel", () => {
        it("loads the recipient and channel and links them as the otp default", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const channel = helpers.createChannel({ id: CHANNEL_ID, recipient, type: ChannelType.EMAIL });
            const { service, repositories, transaction } = helpers.service({ recipient });
            const selectSpy = jest.spyOn(recipient, "selectOtpChannel");
            repositories.channels.findUniqueOrThrow.mockImplementation(() => Promise.resolve(channel));

            const result = await service.selectOtpChannel({
                input: { account: ACCOUNT_ID, channel: CHANNEL_ID },
                transaction: transaction.entityManager,
            });

            expect(repositories.channels.findUniqueOrThrow).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                options: { populate: ["recipient"] },
                where: { id: CHANNEL_ID },
            });
            expect(selectSpy).toHaveBeenCalledTimes(1);
            expect(selectSpy.mock.calls[0][0]).toBe(channel);
            expect(result).toBe(recipient);
        });
    });

    describe("purge", () => {
        it("finds the recipient by account and removes it", async () => {
            const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
            const { service, repositories, transaction } = helpers.service({ recipient });

            await service.purge({
                transaction: transaction.entityManager,
                input: { account: ACCOUNT_ID },
            });

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(transaction.remove).toHaveBeenCalledWith(recipient);
        });
    });
});
