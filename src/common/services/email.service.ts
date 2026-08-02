import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Injectable, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable({ scope: Scope.DEFAULT })
export class EmailService implements CommonServices.Email.Contract {
    private readonly client: SESClient;
    private readonly from: string;

    public constructor(private readonly config: ConfigService) {
        this.from = this.config.getOrThrow<string>("EMAIL_FROM");

        this.client = new SESClient({
            region: this.config.getOrThrow<string>("AWS_REGION"),
            credentials: {
                secretAccessKey: this.config.getOrThrow<string>("AWS_SECRET_ACCESS_KEY"),
                accessKeyId: this.config.getOrThrow<string>("AWS_ACCESS_KEY_ID"),
            },
        });
    }

    public async send({ subject, html, to }: CommonServices.Email.Send): Promise<void> {
        await this.client.send(
            new SendEmailCommand({
                Source: this.from,
                Destination: { ToAddresses: [to] },
                Message: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: html } },
                },
            }),
        );
    }
}
