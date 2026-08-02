import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Injectable, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable({ scope: Scope.DEFAULT })
export class SMSService implements CommonServices.SMS.Contract {
    private readonly client: SNSClient;

    public constructor(private readonly config: ConfigService) {
        this.client = new SNSClient({
            region: this.config.getOrThrow<string>("AWS_REGION"),
            credentials: {
                accessKeyId: this.config.getOrThrow<string>("AWS_ACCESS_KEY_ID"),
                secretAccessKey: this.config.getOrThrow<string>("AWS_SECRET_ACCESS_KEY"),
            },
        });
    }

    public async send({ body, to }: CommonServices.SMS.Send): Promise<void> {
        await this.client.send(
            new PublishCommand({
                PhoneNumber: to,
                Message: body,
                MessageAttributes: {
                    "AWS.SNS.SMS.SMSType": {
                        DataType: "String",
                        StringValue: "Transactional",
                    },
                },
            }),
        );
    }
}
