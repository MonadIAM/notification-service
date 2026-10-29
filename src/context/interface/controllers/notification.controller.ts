import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post, Get, Sse } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiProduces } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { NOTIFICATION_STREAM_SERVICE } from "~context/infrastructure/services/tokens";
import { NOTIFICATION_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { GetByIdQueryDTO, GetListQueryDTO, NotificationDTO, GetListBodyDTO, ListDTO } from "../dto/notification";

const { NOTIFICATION_READ_PERSONAL } = PermissionCode;
const {
    INTERNAL_SERVER_ERROR,
    UNPROCESSABLE_ENTITY,
    SERVICE_UNAVAILABLE,
    REQUEST_TIMEOUT,
    UNAUTHORIZED,
    FORBIDDEN,
    NOT_FOUND,
    OK,
} = HttpStatus;

@ApiTags("Notification")
@Controller("/notification")
export class NotificationController {
    public constructor(
        @Inject(NOTIFICATION_QUERIES)
        private readonly notificationQueries: Queries.Notification.ControllerContract,
        @Inject(NOTIFICATION_STREAM_SERVICE)
        private readonly notificationStream: InfrastructureServices.NotificationStream.PublicContract,
    ) {}

    @Sse("unread-count/stream")
    @ApiProduces("text/event-stream")
    @RequirePermission(NOTIFICATION_READ_PERSONAL)
    @ApiOperation({
        summary: "Streams unread notification counts and new message identifiers",
        security: [{ identity: [] }],
    })
    public watchUnread(
        @Extract.Session() session: Extract.Session.Auth,
    ): InfrastructureServices.NotificationStream.Watch.Result {
        return this.notificationStream.watch(session);
    }

    @Get()
    @HttpCode(OK)
    @FormatResponse(NotificationDTO)
    @RequirePermission(NOTIFICATION_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns a notification by identifier",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(
        INTERNAL_SERVER_ERROR,
        UNPROCESSABLE_ENTITY,
        SERVICE_UNAVAILABLE,
        REQUEST_TIMEOUT,
        UNAUTHORIZED,
        NOT_FOUND,
        FORBIDDEN,
    )
    public findUnique(
        @Query() { notification, mode }: GetByIdQueryDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
    ): Queries.Notification.FindUnique.Result {
        return this.notificationQueries.findUnique({ mode, notification, actor });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequirePermission(NOTIFICATION_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns a paginated list of notifications for the current account",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(
        INTERNAL_SERVER_ERROR,
        UNPROCESSABLE_ENTITY,
        SERVICE_UNAVAILABLE,
        REQUEST_TIMEOUT,
        UNAUTHORIZED,
        FORBIDDEN,
    )
    public findMany(
        @Body() { pagination, filters, sort }: GetListBodyDTO,
        @Query() { mode }: GetListQueryDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
    ): Queries.Notification.FindMany.Result {
        return this.notificationQueries.findMany({ mode, pagination, filters, sort, actor });
    }
}
