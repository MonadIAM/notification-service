import { Job } from "bullmq";

import { CleanupJob } from "~context/enums";

declare global {
    namespace Queues {
        namespace DispatchDelay {
            type JobData = {
                message: string;
            };

            interface Contract {
                schedule: Schedule.Signature;
                cancel: Cancel.Signature;
            }

            namespace Schedule {
                type Props = {
                    message: string;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Cancel {
                type Props = {
                    message: string;
                };

                type Result = Promise<boolean>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace KafkaRetry {
            type JobData = Consumers.DLQ.Message;

            interface Contract {
                schedule: Schedule.Signature;
            }

            namespace Schedule {
                type Props = {
                    message: Consumers.DLQ.Message;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }

        namespace Cleanup {
            type Result = {
                nextBatch: boolean;
                deleted: number;
            };

            type Handler = (job: Job) => Promise<Result>;

            type JobData = {
                olderThanMs: number;
                batchSize: number;
            };

            interface Contract {
                scheduleNextBatch: ScheduleNextBatch.Signature;
                schedule: Schedule.Signature;
            }

            namespace ScheduleNextBatch {
                type Props = {
                    job: CleanupJob;
                    data: JobData;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }

            namespace Schedule {
                type Props = {
                    job: CleanupJob;
                    data: JobData;
                };

                type Result = Promise<void>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
