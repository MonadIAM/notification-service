import { Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { MESSAGE_COMMANDS } from "~context/application/commands";
import { MESSAGE_QUERIES } from "~context/application/queries";
import { SuccessMessageDTO } from "~common/dto";
import { PermissionCode } from "~context/enums";

import { GetListQueryDTO, GetListBodyDTO, MarkReadBodyDTO, ListDTO } from "../dto/message";

const { MESSAGE_READ_PERSONAL, MESSAGE_MARK_READ } = PermissionCode;
const {
    INTERNAL_SERVER_ERROR,
    UNPROCESSABLE_ENTITY,
    SERVICE_UNAVAILABLE,
    REQUEST_TIMEOUT,
    UNAUTHORIZED,
    BAD_REQUEST,
    FORBIDDEN,
    NOT_FOUND,
    OK,
} = HttpStatus;

@ApiTags("Message")
@Controller("/message")
export class MessageController {
    public constructor(
        @Inject(MESSAGE_COMMANDS)
        private readonly messageCommands: Commands.Message.ControllerContract,
        @Inject(MESSAGE_QUERIES)
        private readonly messageQueries: Queries.Message.ControllerContract,
    ) {}

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequirePermission(MESSAGE_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns the delivery status of messages for a notification of the current account",
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
        @Body() { pagination, sort }: GetListBodyDTO,
        @Query() { notification, mode }: GetListQueryDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
    ): Queries.Message.FindMany.Result {
        return this.messageQueries.findMany({ mode, notification, actor, pagination, sort });
    }

    @HttpCode(OK)
    @Patch("read")
    @FormatResponse(SuccessMessageDTO)
    @RequirePermission(MESSAGE_MARK_READ)
    @ApiOperation({
        summary: "Marks an in-app notification message as read",
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
    )
    public markRead(
        @Body() input: MarkReadBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Message.MarkRead.Result {
        return this.messageCommands.markRead({ context, actor, input });
    }
}
