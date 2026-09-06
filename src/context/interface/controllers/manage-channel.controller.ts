import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { CHANNEL_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetListQueryDTO, ManageGetListBodyDTO, ManageGetByIdQueryDTO, ChannelDTO, ListDTO } from "../dto/channel";

const { CHANNEL_READ_ABSOLUTE } = PermissionCode;
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

@ApiTags("Channel")
@Controller("/channel/manage")
export class ChannelManageController {
    public constructor(
        @Inject(CHANNEL_QUERIES)
        private readonly channelQueries: Queries.Channel.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(ChannelDTO)
    @RequireGlobalPermission(CHANNEL_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a channel of any account by identifier",
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
    public findUnique(@Query() { channel, mode }: ManageGetByIdQueryDTO): Queries.Channel.FindUnique.Result {
        return this.channelQueries.findUnique({ mode, channel });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequireGlobalPermission(CHANNEL_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list of channels across all accounts",
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
    ): Queries.Channel.FindMany.Result {
        return this.channelQueries.findMany({ mode, pagination, filters, sort });
    }
}
