import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { NOTIFICATION_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { GetByIdQueryDTO, GetListQueryDTO, GetListBodyDTO, NotificationDTO, ListDTO } from "../dto/notification";

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
    ) {}

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
