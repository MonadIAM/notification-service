import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { Job } from "bullmq";

import { FailureReason, KafkaTopic, MessageDispatchAction, MessageStatus } from "~context/enums";
import { MESSAGE_REPOSITORY } from "~context/infrastructure/repositories";
import { MESSAGE_COMMANDS } from "~context/application/commands/tokens";
import { KAFKA_METRICS_RECORDER } from "~observability/metrics/tokens";
import { DISPATCH_SERVICE } from "~context/domain/services";
import { KAFKA_SERVICE } from "~infrastructure/kafka";
import { CONSUMER_META } from "~context/constants";
import { Exception } from "~common/exceptions";

import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.DISPATCH_DELAY)
export class DispatchDelayProcessor extends WorkerHost {
    private readonly logger = new Logger(DispatchDelayProcessor.name);

    public constructor(
        @Inject(KAFKA_METRICS_RECORDER)
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
        if (job.data.terminalError === undefined) {
            try {
                await this.send(job);
            } catch (error) {
                if (Exception.isRetryable(error) && job.attemptsMade + 1 < (job.opts.attempts ?? 1)) {
                    throw error;
                }

                await job.updateData({ ...job.data, terminalError: String(error) });
            }
        }

        if (job.data.terminalError !== undefined) {
            await this.reject(job);
        }
    }

    public async send(job: Job<Queues.DispatchDelay.JobData>): Promise<void> {
        const dispatch = await this.messageRepository.findUniqueOrThrow({
            options: { populate: ["notification"] },
            where: { id: job.data.message },
        });

        if (dispatch.status === MessageStatus.QUEUED) {
            await this.dispatchService.send({ message: dispatch });
            await this.messageCommands.markSent({ context: CONSUMER_META, input: { message: dispatch.id } });
        }
    }

    public async reject(job: Job<Queues.DispatchDelay.JobData>): Promise<void> {
        const failure = job.data.terminalError ?? "unknown delayed dispatch failure";
        const message: Consumers.MessageDispatch.Message = {
            actionType: MessageDispatchAction.DISPATCH,
            payload: { message: job.data.message },
        };
        this.logger.error(`Delayed dispatch rejected for message "${job.data.message}": ${failure}`);

        const [[dispatch]] = await this.messageRepository.findMany({ where: { id: job.data.message } });
        if (dispatch?.status === MessageStatus.QUEUED) {
            await this.messageCommands.markFailed({
                context: CONSUMER_META,
                input: {
                    reason: FailureReason.PROVIDER,
                    message: job.data.message,
                    error: failure,
                },
            });
        }

        await lastValueFrom(
            this.kafkaClient.emit(KafkaTopic.MESSAGE_DISPATCH_DEAD, {
                key: job.data.event,
                value: {
                    originalTopic: KafkaTopic.MESSAGE_DISPATCH,
                    payload: message,
                    error: failure,
                },
            }),
        );
        this.kafkaMetrics.recordDead({ topic: KafkaTopic.MESSAGE_DISPATCH, error: failure });
    }
}
