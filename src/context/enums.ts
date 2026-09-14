export * from "@monadiam/shared";

export enum ChannelType {
    /* eslint-disable prettier/prettier */
    IN_APP = "IN_APP",
    EMAIL  = "EMAIL",
    SMS    = "SMS",
    /* eslint-enable prettier/prettier */
}

export enum MessageStatus {
    /* eslint-disable prettier/prettier */
    QUEUED    = "QUEUED",
    SENT      = "SENT",
    DELIVERED = "DELIVERED",
    FAILED    = "FAILED",
    CANCELLED = "CANCELLED",
    /* eslint-enable prettier/prettier */
}

export enum FailureReason {
    /* eslint-disable prettier/prettier */
    SUPPRESSED = "SUPPRESSED",
    COMPLAINT  = "COMPLAINT",
    PROVIDER   = "PROVIDER",
    INTERNAL   = "INTERNAL",
    BOUNCE     = "BOUNCE",
    /* eslint-enable prettier/prettier */
}

export enum ResponseViewType {
    /* eslint-disable prettier/prettier */
    DETAILED = "DETAILED",
    COMPACT  = "COMPACT",
    /* eslint-enable prettier/prettier */
}

/** @public */
export enum QueryMode {
    /* eslint-disable prettier/prettier */
    DEFAULT = "DEFAULT",
    MANAGE  = "MANAGE",
    /* eslint-enable prettier/prettier */
}

export enum EntityType {
    /* eslint-disable prettier/prettier */
    NOTIFICATION = "NOTIFICATION",
    PREFERENCE   = "PREFERENCE",
    RECIPIENT    = "RECIPIENT",
    CHANNEL      = "CHANNEL",
    MESSAGE      = "MESSAGE",
    /* eslint-enable prettier/prettier */
}

export enum ActionType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export enum MessageDispatchAction {
    DISPATCH = "DISPATCH",
}

export enum CleanupJob {
    /* eslint-disable prettier/prettier */
    CHANGE_LOG = "cleanup-change-log",
    AUDIT_LOG  = "cleanup-audit-log",
    INBOX      = "cleanup-inbox",
    /* eslint-enable prettier/prettier */
}
