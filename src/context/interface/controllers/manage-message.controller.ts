import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { MESSAGE_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetListQueryDTO, ManageGetListBodyDTO, ManageGetByIdQueryDTO, MessageDTO, ListDTO } from "../dto/message";

const { MESSAGE_READ_ABSOLUTE } = PermissionCode;
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

@ApiTags("Message")
@Controller("/message/manage")
export class MessageManageController {
    public constructor(
        @Inject(MESSAGE_QUERIES)
        private readonly messageQueries: Queries.Message.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(MessageDTO)
    @RequireGlobalPermission(MESSAGE_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a message of any account by identifier",
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
    public findUnique(@Query() { message, mode }: ManageGetByIdQueryDTO): Queries.Message.FindUnique.Result {
        return this.messageQueries.findUnique({ mode, message });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequireGlobalPermission(MESSAGE_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list of messages across all accounts",
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
    ): Queries.Message.FindMany.Result {
        return this.messageQueries.findMany({ mode, pagination, filters, sort });
    }
}
