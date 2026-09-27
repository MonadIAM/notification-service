import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { ConfigService } from "@nestjs/config";

import { SMSService } from "./sms.service";

const config = new ConfigService({
    AWS_REGION: "eu-west-1",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret",
});

describe("SMSService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("send", () => {
        it("publishes a transactional SMS with the original phone number and Unicode message", async () => {
            const send = jest.spyOn(SNSClient.prototype, "send").mockResolvedValue({} as never);
            const service = new SMSService(config);
            const props = { to: "+12025550123", body: "Your code: 123456" };

            const result = await service.send(props);
            const command = send.mock.calls[0][0] as PublishCommand;
            const client = send.mock.contexts[0] as SNSClient;
            const region = await client.config.region();
            const credentials = await client.config.credentials();

            expect(result).toBeUndefined();
            expect(send).toHaveBeenCalledTimes(1);
            expect(command).toBeInstanceOf(PublishCommand);
            expect(command.input).toEqual({
                PhoneNumber: props.to,
                Message: props.body,
                MessageAttributes: { "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" } },
            });
            expect(region).toBe("eu-west-1");
            expect(credentials).toMatchObject({
                accessKeyId: "test-key",
                secretAccessKey: "test-secret",
            });
        });

        it("propagates the original provider failure to the caller", async () => {
            const error = new Error("SNS throttled");
            jest.spyOn(SNSClient.prototype, "send").mockRejectedValue(error as never);
            const service = new SMSService(config);

            await expect(service.send({ to: "+12025550123", body: "123456" })).rejects.toBe(error);
        });
    });
});
