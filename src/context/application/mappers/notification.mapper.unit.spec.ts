import { describe, expect, it } from "@jest/globals";

import { DomainServiceCoreUnitHelpers } from "~testing/unit/core.helpers";
import { ChannelType } from "~context/enums";

import { NotificationMapper } from "./notification.mapper";

/* eslint-disable prettier/prettier */
const EMAIL_MESSAGE_ID  = "00000000-0000-4000-8000-000000000001";
const IN_APP_MESSAGE_ID = "00000000-0000-4000-8000-000000000002";
const SMS_MESSAGE_ID    = "00000000-0000-4000-8000-000000000003";
/* eslint-enable prettier/prettier */

const helpers = new DomainServiceCoreUnitHelpers();
const mapper = new NotificationMapper();

describe("[DataMapper] - Notification", () => {
    describe("[Method] - messageDispatchPayload", () => {
        it("[case] - maps dispatchable messages in order and excludes in-app messages", () => {
            // Arrange
            const email = helpers.createMessage({ id: EMAIL_MESSAGE_ID, channelType: ChannelType.EMAIL });
            const inApp = helpers.createMessage({ id: IN_APP_MESSAGE_ID, channelType: ChannelType.IN_APP });
            const sms = helpers.createMessage({ id: SMS_MESSAGE_ID, channelType: ChannelType.SMS });

            // Act
            const result = mapper.messageDispatchPayload({ messages: [email, inApp, sms] });

            // Assert
            expect(result).toEqual([{ message: EMAIL_MESSAGE_ID }, { message: SMS_MESSAGE_ID }]);
        });
    });
});
