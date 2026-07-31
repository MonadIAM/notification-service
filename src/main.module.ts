import { APP_FILTER } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { NotificationModule } from "~context/notification.module";
import { InfrastructureModule } from "~infrastructure";
import { ObservabilityModule } from "~observability";
import { SystemModule } from "~common/system.module";
import { ExceptionFilter } from "~common/exceptions";

@Module({
    imports: [SystemModule, InfrastructureModule, ObservabilityModule, NotificationModule],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ExceptionFilter,
        },
    ],
})
export class MainModule {}
