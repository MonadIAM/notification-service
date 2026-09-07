import { Provider } from "@nestjs/common";

import { DispatchDelayProcessor, DispatchDelayQueue } from "./dispatch-delay";
import { KafkaRetryProcessor, KafkaRetryQueue } from "./kafka-retry";
import { CleanupProcessor, CleanupQueue } from "./cleanup";
import { BULLMQ_JOBS_PROVIDER } from "./metrics.provider";
import {
    DISPATCH_DELAY_PROCESSOR,
    KAFKA_RETRY_PROCESSOR,
    DISPATCH_DELAY_QUEUE,
    KAFKA_RETRY_QUEUE,
    CLEANUP_PROCESSOR,
    CLEANUP_QUEUE,
} from "./tokens";

export const QUEUES: Provider[] = [
    BULLMQ_JOBS_PROVIDER,
    {
        provide: DISPATCH_DELAY_PROCESSOR,
        useClass: DispatchDelayProcessor,
    },
    {
        provide: KAFKA_RETRY_PROCESSOR,
        useClass: KafkaRetryProcessor,
    },
    {
        provide: CLEANUP_PROCESSOR,
        useClass: CleanupProcessor,
    },
    {
        provide: DISPATCH_DELAY_QUEUE,
        useClass: DispatchDelayQueue,
    },
    {
        provide: KAFKA_RETRY_QUEUE,
        useClass: KafkaRetryQueue,
    },
    {
        provide: CLEANUP_QUEUE,
        useClass: CleanupQueue,
    },
];

export { DISPATCH_DELAY_PROCESSOR, KAFKA_RETRY_PROCESSOR, CLEANUP_PROCESSOR };
export { DISPATCH_DELAY_QUEUE, KAFKA_RETRY_QUEUE, CLEANUP_QUEUE };
export { BullQueue } from "./enums";
