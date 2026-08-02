import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { lastValueFrom } from "rxjs";

import { FailureReason, ChannelType, KafkaTopic } from "~context/enums";
import { KafkaUtils, KAFKA_SERVICE } from "~infrastructure/kafka";
import { MESSAGE_REPOSITORY } from "~context/domain/repositories";
import { EMAIL_SERVICE, SMS_SERVICE } from "~common/services";
import { Exception } from "~common/exceptions";

import { MESSAGE_COMMANDS } from "../commands";

@Controller()
export class DispatchConsumer implements Consumers.MessageDispatch.Contract, OnModuleInit {
    private readonly logger = new Logger(DispatchConsumer.name);

    public constructor(
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.QueryContract,
        @Inject(MESSAGE_COMMANDS)
        private readonly messageCommands: Commands.Message.ConsumerContract,
        @Inject(EMAIL_SERVICE)
        private readonly emailService: CommonServices.Email.Contract,
        @Inject(SMS_SERVICE)
        private readonly smsService: CommonServices.SMS.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {}

    public async onModuleInit(): Promise<void> {
        await this.kafkaClient.connect();
    }

    @EventPattern(KafkaTopic.MESSAGE_DISPATCH)
    public async handle(
        @Payload() message: Consumers.MessageDispatch.Message,
        @Ctx() context: KafkaContext,
    ): Promise<void> {
        try {
            const dispatch = await this.messageRepository.findUniqueOrThrow({
                options: { populate: ["notification"] },
                where: { id: message.payload.message },
            });

            if (dispatch.channelType === ChannelType.EMAIL) {
                await this.emailService.send({
                    subject: dispatch.notification.title ?? "",
                    html: dispatch.notification.body ?? "",
                    to: dispatch.address,
                });
            } else {
                await this.smsService.send({
                    body: dispatch.notification.body ?? "",
                    to: dispatch.address,
                });
            }

            await this.messageCommands.markSent({ message: dispatch.id });
        } catch (error) {
            if (Exception.isRetryable(error)) {
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.MESSAGE_DISPATCH_RETRY, {
                        headers: {
                            "x-retry-count": String(KafkaUtils.extractRetryCount(context)),
                        },
                        value: {
                            originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                            payload: message,
                            error: String(error),
                        },
                    }),
                );
            } else {
                this.logger.warn(`Non-retryable error in message dispatch consumer: ${String(error)}`);
                await this.messageCommands.markFailed({
                    message: message.payload.message,
                    reason: FailureReason.PROVIDER,
                    error: String(error),
                });
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.MESSAGE_DISPATCH_DEAD, {
                        value: {
                            originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                            payload: message,
                            error: String(error),
                        },
                    }),
                );
            }
        }
    }
}
