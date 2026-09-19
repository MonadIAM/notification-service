import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import { Job } from "bullmq";

import { KAFKA_RETRY_REGISTRY } from "~infrastructure/kafka";
import { Exception } from "~common/exceptions";

import { BullQueue } from "../enums";

@Injectable()
@Processor(BullQueue.KAFKA_RETRY)
export class KafkaRetryProcessor extends WorkerHost {
    public constructor(
        @Inject(KAFKA_RETRY_REGISTRY)
        private readonly retryRegistry: Kafka.RetryRegistry.Contract,
    ) {
        super();
    }

    public async process(job: Job<Queues.KafkaRetry.JobData>): Promise<void> {
        const { originalTopic, payload, event } = job.data;
        const entry = this.retryRegistry.resolve({ topic: originalTopic });

        if (!entry) {
            throw Exception.invariantViolation({
                messageKey: "services.kafka-retry.HANDLER_NOT_REGISTERED",
                params: { topic: originalTopic },
            });
        }

        const props = {
            incoming: { consumerKey: entry.consumerKey, event },
            message: payload,
        };

        if (!job.data.terminalError) {
            try {
                await entry.handler.process(props);
            } catch (error) {
                if (Exception.isRetryable(error) && job.attemptsMade + 1 < (job.opts.attempts ?? 1)) {
                    throw error;
                }

                await job.updateData({ ...job.data, terminalError: String(error) });
            }
        }

        if (job.data.terminalError) {
            await entry.handler.reject({ ...props, error: job.data.terminalError, terminal: true });
        }
    }
}
