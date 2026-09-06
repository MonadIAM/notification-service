import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { NOTIFICATION_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import {
    ManageGetListQueryDTO,
    ManageGetByIdQueryDTO,
    ManageGetListBodyDTO,
    NotificationDTO,
    ListDTO,
} from "../dto/notification";

const { NOTIFICATION_READ_ABSOLUTE } = PermissionCode;
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
@Controller("/notification/manage")
export class NotificationManageController {
    public constructor(
        @Inject(NOTIFICATION_QUERIES)
        private readonly notificationQueries: Queries.Notification.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(NotificationDTO)
    @RequireGlobalPermission(NOTIFICATION_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a notification of any account by identifier",
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
    public findUnique(@Query() { notification, mode }: ManageGetByIdQueryDTO): Queries.Notification.FindUnique.Result {
        return this.notificationQueries.findUnique({ mode, notification });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequireGlobalPermission(NOTIFICATION_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list of notifications across all accounts",
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
        @Body() { pagination, filters, sort }: ManageGetListBodyDTO,
        @Query() { mode }: ManageGetListQueryDTO,
    ): Queries.Notification.FindMany.Result {
        return this.notificationQueries.findMany({ mode, pagination, filters, sort });
    }
}
