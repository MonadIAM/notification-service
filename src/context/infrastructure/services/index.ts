import { ClassProvider } from "@nestjs/common";

import { ReauthenticationCacheService } from "./reauthentication-cache.service";
import { NotificationStreamService } from "./notification-stream.service";
import { BlacklistCacheService } from "./blacklist-cache.service";
import { AccessCacheService } from "./access-cache.service";
import {
    REAUTHENTICATION_CACHE_SERVICE,
    NOTIFICATION_STREAM_SERVICE,
    BLACKLIST_CACHE_SERVICE,
    ACCESS_CACHE_SERVICE,
} from "./tokens";

export const INFRASTRUCTURE_SERVICES: ClassProvider[] = [
    {
        provide: REAUTHENTICATION_CACHE_SERVICE,
        useClass: ReauthenticationCacheService,
    },
    {
        provide: NOTIFICATION_STREAM_SERVICE,
        useClass: NotificationStreamService,
    },
    {
        provide: BLACKLIST_CACHE_SERVICE,
        useClass: BlacklistCacheService,
    },
    {
        provide: ACCESS_CACHE_SERVICE,
        useClass: AccessCacheService,
    },
];

export { REAUTHENTICATION_CACHE_SERVICE, NOTIFICATION_STREAM_SERVICE, BLACKLIST_CACHE_SERVICE, ACCESS_CACHE_SERVICE };
