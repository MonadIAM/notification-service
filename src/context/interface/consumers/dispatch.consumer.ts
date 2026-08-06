import { EventPattern, Payload, ClientKafka, Ctx, KafkaContext } from "@nestjs/microservices";
import { Controller, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { lastValueFrom } from "rxjs";

import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues";
import { KafkaUtils, KAFKA_SERVICE } from "~infrastructure/kafka";
import { MESSAGE_REPOSITORY } from "~context/domain/repositories";
import { DISPATCH_SERVICE } from "~context/application/services";
import { FailureReason, KafkaTopic } from "~context/enums";
import { DEBOUNCED_CATEGORIES } from "~context/constants";
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
        @Inject(DISPATCH_DELAY_QUEUE)
        private readonly dispatchDelayQueue: Queues.DispatchDelay.Contract,
        @Inject(DISPATCH_SERVICE)
        private readonly dispatchService: Services.Dispatch.Contract,
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
    ): Consumers.MessageDispatch.Handle.Result {
        try {
            const dispatch = await this.messageRepository.findUniqueOrThrow({
                options: { populate: ["notification"] },
                where: { id: message.payload.message },
            });

            if (DEBOUNCED_CATEGORIES.includes(dispatch.notification.category)) {
                await this.dispatchDelayQueue.schedule({ message: dispatch.id });
                return;
            }

            await this.dispatchService.send({ message: dispatch });
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
