import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { MESSAGE_REPOSITORY } from "~context/domain/repositories";
import { FailureReason, MessageStatus } from "~context/enums";
import { DISPATCH_SERVICE } from "~context/application/services";
import { MESSAGE_COMMANDS } from "~context/interface/commands";
import { CONSUMER_META } from "~context/constants";

import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.DISPATCH_DELAY)
export class DispatchDelayProcessor extends WorkerHost {
    private readonly logger = new Logger(DispatchDelayProcessor.name);

    public constructor(
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.QueryContract,
        @Inject(MESSAGE_COMMANDS)
        private readonly messageCommands: Commands.Message.ConsumerContract,
        @Inject(DISPATCH_SERVICE)
        private readonly dispatchService: Services.Dispatch.Contract,
    ) {
        super();
    }

    public async process(job: Job<Queues.DispatchDelay.JobData>): Promise<void> {
        const dispatch = await this.messageRepository.findUniqueOrThrow({
            options: { populate: ["notification"] },
            where: { id: job.data.message },
        });

        if (dispatch.status === MessageStatus.CANCELLED) {
            return;
        }

        await this.dispatchService.send({ message: dispatch });
        await this.messageCommands.markSent({ context: CONSUMER_META, input: { message: dispatch.id } });
    }

    @OnWorkerEvent("failed")
    public async onFailed(job: Job<Queues.DispatchDelay.JobData>): Promise<void> {
        if (job.attemptsMade < (job.opts.attempts ?? 1)) {
            return;
        }

        this.logger.error(
            `Delayed dispatch exhausted after ${job.attemptsMade} attempts for message "${job.data.message}": ${job.failedReason}`,
        );

        await this.messageCommands.markFailed({
            context: CONSUMER_META,
            input: {
                message: job.data.message,
                reason: FailureReason.PROVIDER,
                error: job.failedReason,
            },
        });
    }
}
