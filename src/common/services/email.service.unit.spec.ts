import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ConfigService } from "@nestjs/config";

import { EmailService } from "./email.service";

const config = new ConfigService({
    EMAIL_FROM: "sender@example.test",
    AWS_REGION: "eu-west-1",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret",
});

describe("[CommonService] - Email", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("[Method] - send", () => {
        it("[case] - sends the recipient, subject and HTML unchanged through SES", async () => {
            // Arrange
            const send = jest.spyOn(SESClient.prototype, "send").mockResolvedValue({} as never);
            const service = new EmailService(config);
            const props = { to: "recipient@example.test", subject: "Login 🔐", html: "<p>Your code: <b>123456</b></p>" };

            // Act
            const result = await service.send(props);
            const command = send.mock.calls[0][0] as SendEmailCommand;
            const client = send.mock.contexts[0] as SESClient;
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
            expect(result3).toBeInstanceOf(SendEmailCommand);
            expect(result4).toEqual({
                Source: "sender@example.test",
                Destination: { ToAddresses: [props.to] },
                Message: { Subject: { Data: props.subject }, Body: { Html: { Data: props.html } } },
            });
            expect(result5).toBe("eu-west-1");
            expect(credentials).toMatchObject({
                accessKeyId: "test-key",
                secretAccessKey: "test-secret",
            });
        });

        it("[case] - propagates the original delivery failure to the caller", async () => {
            // Arrange
            const error = new Error("SES unavailable");
            jest.spyOn(SESClient.prototype, "send").mockRejectedValue(error as never);
            const service = new EmailService(config);

            // Act
            const result = service.send({ to: "recipient@example.test", subject: "Subject", html: "Body" });

            // Assert
            await expect(result).rejects.toBe(error);
        });
    });
});
