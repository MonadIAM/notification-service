import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { ConfigService } from "@nestjs/config";

import { SMSService } from "./sms.service";

const config = new ConfigService({
    AWS_REGION: "eu-west-1",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret",
});

describe("[CommonService] - SMS", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - send", () => {
        it("[case] - publishes a transactional SMS with the original phone number and Unicode message", async () => {
            // Arrange
            const send = jest.spyOn(SNSClient.prototype, "send").mockResolvedValue({} as never);
            const service = new SMSService(config);
            const props = { to: "+12025550123", body: "Your code: 123456" };

            // Act
            const result = await service.send(props);
            const command = send.mock.calls[0][0] as PublishCommand;
            const client = send.mock.contexts[0] as SNSClient;
            const region = await client.config.region();
            const credentials = await client.config.credentials();
            const result1 = result;
            const result2 = send;
            const result3 = command;
            const result4 = command.input;
            const result5 = region;

            // Assert
            expect(result1).toBeUndefined();
            expect(result2).toHaveBeenCalledTimes(1);
            expect(result3).toBeInstanceOf(PublishCommand);
            expect(result4).toEqual({
                PhoneNumber: props.to,
                Message: props.body,
                MessageAttributes: { "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" } },
            });
            expect(result5).toBe("eu-west-1");
            expect(credentials).toMatchObject({
                accessKeyId: "test-key",
                secretAccessKey: "test-secret",
            });
        });

        it("[case] - propagates the original provider failure to the caller", async () => {
            // Arrange
            const error = new Error("SNS throttled");
            jest.spyOn(SNSClient.prototype, "send").mockRejectedValue(error as never);
            const service = new SMSService(config);

            // Act
            const result = service.send({ to: "+12025550123", body: "123456" });

            // Assert
            await expect(result).rejects.toBe(error);
        });
    });
});
