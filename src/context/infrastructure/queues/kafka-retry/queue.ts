import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import ms, { StringValue } from "ms";
import { Queue } from "bullmq";

import { BullJobName, BullQueue } from "../enums";

@Injectable()
export class KafkaRetryQueue implements Queues.KafkaRetry.Contract {
    private readonly attempts: number;
    private readonly baseDelay: number;
    private readonly jitter: number;

    public constructor(
        @InjectQueue(BullQueue.KAFKA_RETRY)
        private readonly queue: Queue<Queues.KafkaRetry.JobData>,
        private readonly configService: ConfigService,
    ) {
        this.baseDelay = ms(this.configService.getOrThrow<StringValue>("DISPATCH_RETRY_BASE_DELAY"));
        this.jitter = ms(this.configService.getOrThrow<StringValue>("DISPATCH_RETRY_JITTER"));
        this.attempts = this.configService.getOrThrow<number>("DISPATCH_RETRY_ATTEMPTS");
    }

    public async schedule(props: Queues.KafkaRetry.Schedule.Props): Queues.KafkaRetry.Schedule.Result {
        const { event, message } = props;
        const data = { ...message, event };

        await this.queue.add(BullJobName.RETRY, data, {
            delay: this.baseDelay + Math.random() * this.jitter,
            jobId: `${message.originalTopic}-${event}`,
            attempts: this.attempts,
            removeOnComplete: true,
            removeOnFail: false,
            backoff: {
                delay: this.baseDelay,
                type: "exponential",
            },
        });
    }
}
