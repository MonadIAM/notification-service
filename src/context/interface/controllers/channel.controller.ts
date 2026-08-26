import { UseInterceptors, Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { CHANNEL_COMMANDS } from "~context/application/commands";
import { CHANNEL_QUERIES } from "~context/application/queries";
import { MonitoringInterceptor } from "~common/interceptors";
import { SuccessMessageDTO } from "~common/dto";
import { PermissionCode } from "~context/enums";

import { GetByIdQueryDTO, GetListQueryDTO, GetListBodyDTO, ChannelDTO, ListDTO } from "../dto/channel";

const { CHANNEL_READ_PERSONAL, CHANNEL_TOGGLE_SOUND } = PermissionCode;
const {
    INTERNAL_SERVER_ERROR,
    UNPROCESSABLE_ENTITY,
    SERVICE_UNAVAILABLE,
    REQUEST_TIMEOUT,
    UNAUTHORIZED,
    BAD_REQUEST,
    FORBIDDEN,
    NOT_FOUND,
    CONFLICT,
    OK,
} = HttpStatus;

@ApiTags("Channel")
@Controller("/channel")
@UseInterceptors(MonitoringInterceptor)
export class ChannelController {
    public constructor(
        @Inject(CHANNEL_COMMANDS)
        private readonly channelCommands: Commands.Channel.ControllerContract,
        @Inject(CHANNEL_QUERIES)
        private readonly channelQueries: Queries.Channel.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(ChannelDTO)
    @RequirePermission(CHANNEL_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns a channel by identifier",
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
        @Query() { channel, mode }: GetByIdQueryDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
    ): Queries.Channel.FindUnique.Result {
        return this.channelQueries.findUnique({ mode, channel, actor });
    }

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequirePermission(CHANNEL_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns a paginated list of channels for the current account",
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
    ): Queries.Channel.FindMany.Result {
        return this.channelQueries.findMany({ mode, pagination, filters, sort, actor });
    }

    @HttpCode(OK)
    @Patch("toggle-sound")
    @FormatResponse(SuccessMessageDTO)
    @RequirePermission(CHANNEL_TOGGLE_SOUND)
    @ApiOperation({
        summary: "Toggles sound for the in-app notification channel",
        security: [{ identity: [] }],
    })
    @Swagger.Exceptions(
        INTERNAL_SERVER_ERROR,
        UNPROCESSABLE_ENTITY,
        SERVICE_UNAVAILABLE,
        REQUEST_TIMEOUT,
        UNAUTHORIZED,
        BAD_REQUEST,
        NOT_FOUND,
        FORBIDDEN,
        CONFLICT,
    )
    public toggleSound(
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Channel.ToggleSound.Result {
        return this.channelCommands.toggleSound({ context, actor });
    }
}
