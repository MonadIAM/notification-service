import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { Job } from "bullmq";

import { FailureReason, KafkaTopic, MessageDispatchAction, MessageStatus } from "~context/enums";
import { KafkaMetricsRecorder } from "~observability/metrics/kafka.recorder";
import { MESSAGE_REPOSITORY } from "~context/infrastructure/repositories";
import { MESSAGE_COMMANDS } from "~context/application/commands/tokens";
import { DISPATCH_SERVICE } from "~context/domain/services";
import { KAFKA_SERVICE } from "~infrastructure/kafka";
import { CONSUMER_META } from "~context/constants";

import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.DISPATCH_DELAY)
export class DispatchDelayProcessor extends WorkerHost {
    private readonly logger = new Logger(DispatchDelayProcessor.name);

    public constructor(
        @Inject(KafkaMetricsRecorder)
        private readonly kafkaMetrics: Observability.Metrics.Kafka.PublicContract,
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.QueryContract,
        @Inject(MESSAGE_COMMANDS)
        private readonly messageCommands: Commands.Message.ConsumerContract,
        @Inject(DISPATCH_SERVICE)
        private readonly dispatchService: Services.Dispatch.Contract,
        @Inject(KAFKA_SERVICE)
        private readonly kafkaClient: ClientKafka,
    ) {
        super();
    }

    public async process(job: Job<Queues.DispatchDelay.JobData>): Promise<void> {
        const dispatch = await this.messageRepository.findUniqueOrThrow({
            options: { populate: ["notification"] },
            where: { id: job.data.message },
        });

        if (dispatch.status !== MessageStatus.CANCELLED) {
            await this.dispatchService.send({ message: dispatch });
            await this.messageCommands.markSent({ context: CONSUMER_META, input: { message: dispatch.id } });
        }
    }

    @OnWorkerEvent("failed")
    public async onFailed(job: Job<Queues.DispatchDelay.JobData>, error: Error): Promise<void> {
        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
            const failure = job.failedReason ?? "unknown delayed dispatch failure";
            const message: Consumers.MessageDispatch.Message = {
                actionType: MessageDispatchAction.DISPATCH,
                payload: { message: job.data.message },
            };

            this.logger.error(
                `Delayed dispatch exhausted after ${job.attemptsMade} attempts for message "${job.data.message}": ${failure}`,
            );

            await this.messageCommands.markFailed({
                context: CONSUMER_META,
                input: {
                    message: job.data.message,
                    reason: FailureReason.PROVIDER,
                    error: failure,
                },
            });

            try {
                await lastValueFrom(
                    this.kafkaClient.emit(KafkaTopic.MESSAGE_DISPATCH_DEAD, {
                        value: {
                            originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                            error: failure,
                            payload: message,
                        },
                    }),
                );
            } catch (publishError) {
                this.logger.error(
                    `Dead-letter publication failed for message "${job.data.message}": ${String(publishError)}`,
                );
            }

            this.kafkaMetrics.recordDead({ topic: KafkaTopic.MESSAGE_DISPATCH, error });
        }
    }
}
