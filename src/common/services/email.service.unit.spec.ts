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

describe("EmailService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("sends the recipient, subject and HTML unchanged through SES", async () => {
        const send = jest.spyOn(SESClient.prototype, "send").mockResolvedValue({} as never);
        const service = new EmailService(config);
        const props = { to: "recipient@example.test", subject: "Login 🔐", html: "<p>Your code: <b>123456</b></p>" };

        const result = await service.send(props);
        const command = send.mock.calls[0][0] as SendEmailCommand;
        const client = send.mock.contexts[0] as SESClient;
        const region = await client.config.region();
        const credentials = await client.config.credentials();

        expect(result).toBeUndefined();
        expect(send).toHaveBeenCalledTimes(1);
        expect(command).toBeInstanceOf(SendEmailCommand);
        expect(command.input).toEqual({
            Source: "sender@example.test",
            Destination: { ToAddresses: [props.to] },
            Message: { Subject: { Data: props.subject }, Body: { Html: { Data: props.html } } },
        });
        expect(region).toBe("eu-west-1");
        expect(credentials).toMatchObject({
            accessKeyId: "test-key",
            secretAccessKey: "test-secret",
        });
    });

    it("propagates the original delivery failure to the caller", async () => {
        const error = new Error("SES unavailable");
        jest.spyOn(SESClient.prototype, "send").mockRejectedValue(error as never);
        const service = new EmailService(config);

        await expect(service.send({ to: "recipient@example.test", subject: "Subject", html: "Body" })).rejects.toBe(error);
    });
});
