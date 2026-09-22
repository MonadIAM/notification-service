import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { NotificationUnitHelpers } from "~testing/unit/domain-service/notification.helpers";
import { NotificationCategory, MessageStatus, PlatformService, ChannelType } from "~context/enums";

const ACCOUNT_ID = "00000000-0000-4000-8000-300000000001";
const IN_APP_CHANNEL_ID = "00000000-0000-4000-8000-300000000002";
const EMAIL_CHANNEL_ID = "00000000-0000-4000-8000-300000000003";

const helpers = new NotificationUnitHelpers();

function createRecipient(props: { channels?: Entities.Channel[]; preferences?: Entities.Preference[] } = {}): {
    recipient: Entities.Recipient;
} {
    const recipient = helpers.createRecipient({ account: ACCOUNT_ID });

    recipient.channels = helpers.collection({ owner: recipient, items: props.channels ?? [] });
    recipient.preferences = helpers.collection({ owner: recipient, items: props.preferences ?? [] });

    return { recipient };
}

function createInput(
    overrides: Partial<Services.Notification.Create.Props["input"]> = {},
): Services.Notification.Create.Props["input"] {
    return {
        sourceService: PlatformService.IDENTITY_SERVICE,
        category: NotificationCategory.SECURITY,
        template: "unit.template",
        account: ACCOUNT_ID,
        title: "Unit Title",
        body: "Unit Body",
        ...overrides,
    };
}

describe("NotificationService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create", () => {
        it("creates messages only for resolved channel types the recipient actually has", async () => {
            const { recipient } = createRecipient({ channels: [] });
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, repositories, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            expect(repositories.recipients.findUniqueOrThrow).toHaveBeenCalledWith({
                options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
                transaction: transaction.entityManager,
                where: { account: ACCOUNT_ID },
            });
            expect(result.messages).toHaveLength(1);
            expect(result.messages[0].channelType).toBe(ChannelType.IN_APP);
            expect(transaction.persist).toHaveBeenNthCalledWith(1, result.notification);
        });

        it("marks an in-app message as sent and delivered right away", async () => {
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp] });
            const { service, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            expect(result.messages[0].status).toBe(MessageStatus.DELIVERED);
            expect(result.messages[0].sentAt).toBeInstanceOf(Date);
            expect(result.messages[0].deliveredAt).toBeInstanceOf(Date);
        });

        it("falls back to the recipient account as address for channels without one", async () => {
            const { recipient } = createRecipient();
            const inApp = helpers.createChannel({ id: IN_APP_CHANNEL_ID, recipient, type: ChannelType.IN_APP });
            const email = helpers.createChannel({
                address: "user@example.com",
                type: ChannelType.EMAIL,
                id: EMAIL_CHANNEL_ID,
                recipient,
            });
            recipient.channels = helpers.collection({ owner: recipient, items: [inApp, email] });
            const { service, transaction } = helpers.service({ recipient });

            const result = await service.create({
                transaction: transaction.entityManager,
                input: createInput(),
            });

            const inAppMessage = result.messages.find(({ channelType }) => channelType === ChannelType.IN_APP);
            const emailMessage = result.messages.find(({ channelType }) => channelType === ChannelType.EMAIL);

            expect(inAppMessage?.address).toBe(ACCOUNT_ID);
            expect(emailMessage?.address).toBe("user@example.com");
        });
    });

    describe("resolveChannelTypes", () => {
        it.each([
            {
                category: NotificationCategory.SECURITY,
                isDuplicationEnabled: false,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: undefined,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: true,
                expected: [ChannelType.IN_APP, ChannelType.EMAIL],
            },
            {
                category: NotificationCategory.INVITES,
                isDuplicationEnabled: false,
                expected: [ChannelType.IN_APP],
            },
        ])(
            "resolves $category with email preference $isDuplicationEnabled",
            ({ category, isDuplicationEnabled, expected }) => {
                const recipient = helpers.createRecipient({ account: ACCOUNT_ID });
                if (isDuplicationEnabled !== undefined) {
                    const preference = helpers.createPreference({
                        channelType: ChannelType.EMAIL,
                        isDuplicationEnabled,
                        recipient,
                        category,
                    });
                    recipient.preferences = helpers.collection({ owner: recipient, items: [preference] });
                }
                const { service } = helpers.service({ recipient });

                const result = service.resolveChannelTypes({ recipient, category });

                expect(result).toEqual(expected);
            },
        );
    });
});
