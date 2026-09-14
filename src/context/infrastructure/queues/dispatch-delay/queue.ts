import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import ms, { StringValue } from "ms";
import { Queue } from "bullmq";

import { BullJobName, BullQueue } from "../enums";

const ACTIVE_JOB_STATES = ["completed", "active"];

@Injectable()
export class DispatchDelayQueue implements Queues.DispatchDelay.Contract {
    private readonly backoffDelay: number;
    private readonly attempts: number;
    private readonly delay: number;

    public constructor(
        @InjectQueue(BullQueue.DISPATCH_DELAY)
        private readonly queue: Queue<Queues.DispatchDelay.JobData>,
        private readonly configService: ConfigService,
    ) {
        this.backoffDelay = ms(this.configService.getOrThrow<StringValue>("DISPATCH_DEBOUNCE_BACKOFF_DELAY"));
        this.delay = ms(this.configService.getOrThrow<StringValue>("DISPATCH_DEBOUNCE_DELAY"));
        this.attempts = this.configService.getOrThrow<number>("DISPATCH_DEBOUNCE_ATTEMPTS");
    }

    public async schedule(props: Queues.DispatchDelay.Schedule.Props): Promise<void> {
        await this.queue.add(
            BullJobName.DISPATCH,
            { message: props.message, event: props.event },
            {
                jobId: `dispatch:${props.message}`,
                attempts: this.attempts,
                removeOnComplete: true,
                removeOnFail: false,
                delay: this.delay,
                backoff: {
                    delay: this.backoffDelay,
                    type: "exponential",
                },
            },
        );
    }

    public async cancel(props: Queues.DispatchDelay.Cancel.Props): Promise<boolean> {
        const job = await this.queue.getJob(`dispatch:${props.message}`);

        if (!job) {
            return false;
        }

        const state = await job.getState();

        if (ACTIVE_JOB_STATES.includes(state)) {
            return false;
        }

        await job.remove();
        return true;
    }
}
