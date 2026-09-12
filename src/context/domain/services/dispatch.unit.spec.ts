import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { DispatchUnitHelpers } from "~testing/unit/domain-service/dispatch.helpers";
import { ChannelType } from "~context/enums";

const helpers = new DispatchUnitHelpers();

function createMessage(channelType: ChannelType): Entities.Message {
    const notification = helpers.createNotification({ title: "Unit Title", body: "Unit Body" });

    return helpers.createMessage({ notification, channelType, address: "user@example.com" });
}

describe("DispatchService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("send", () => {
        it("routes an email message to the email adapter with subject and html", async () => {
            const { service, services } = helpers.service();
            const message = createMessage(ChannelType.EMAIL);

            await service.send({ message });

            expect(services.email.send).toHaveBeenCalledWith({
                to: "user@example.com",
                subject: "Unit Title",
                html: "Unit Body",
            });
            expect(services.sms.send).not.toHaveBeenCalled();
        });

        it("routes any non-email message to the sms adapter with the body only", async () => {
            const { service, services } = helpers.service();
            const message = createMessage(ChannelType.SMS);

            await service.send({ message });

            expect(services.sms.send).toHaveBeenCalledWith({
                to: "user@example.com",
                body: "Unit Body",
            });
            expect(services.email.send).not.toHaveBeenCalled();
        });
    });
});
