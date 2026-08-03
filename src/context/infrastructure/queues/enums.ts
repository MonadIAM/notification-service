export enum BullQueue {
    /* eslint-disable prettier/prettier */
    DISPATCH_DELAY = "dispatch-delay",
    KAFKA_RETRY    = "kafka-retry",
    CLEANUP        = "cleanup",
    /* eslint-enable prettier/prettier */
}

export enum BullJobName {
    /* eslint-disable prettier/prettier */
    DISPATCH = "dispatch",
    RETRY    = "retry",
    /* eslint-enable prettier/prettier */
}
