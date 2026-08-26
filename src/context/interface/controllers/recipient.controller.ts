import { UseInterceptors, Controller, HttpStatus, HttpCode, Inject, Patch, Body, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { RECIPIENT_COMMANDS } from "~context/application/commands";
import { RECIPIENT_QUERIES } from "~context/application/queries";
import { MonitoringInterceptor } from "~common/interceptors";
import { QueryMode, PermissionCode } from "~context/enums";
import { SuccessMessageDTO } from "~common/dto";

import { SelectOtpChannelBodyDTO, UpdateBodyDTO, RecipientDTO } from "../dto/recipient";

const { RECIPIENT_READ_PERSONAL, RECIPIENT_SELECT_OTP_CHANNEL, RECIPIENT_UPDATE } = PermissionCode;
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

@ApiTags("Recipient")
@Controller("/recipient")
@UseInterceptors(MonitoringInterceptor)
export class RecipientController {
    public constructor(
        @Inject(RECIPIENT_COMMANDS)
        private readonly recipientCommands: Commands.Recipient.ControllerContract,
        @Inject(RECIPIENT_QUERIES)
        private readonly recipientQueries: Queries.Recipient.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(RecipientDTO)
    @RequirePermission(RECIPIENT_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns the recipient profile of the current account",
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
    public findUnique(@Extract.Session() { account: actor }: Extract.Session.Auth): Queries.Recipient.FindUnique.Result {
        return this.recipientQueries.findUnique({ mode: QueryMode.DEFAULT, actor });
    }

    @Patch()
    @HttpCode(OK)
    @FormatResponse(SuccessMessageDTO)
    @RequirePermission(RECIPIENT_UPDATE)
    @ApiOperation({
        summary: "Updates the recipient profile of the current account",
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
    public update(
        @Body() input: UpdateBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Recipient.Update.Result {
        return this.recipientCommands.update({ context, actor, input });
    }

    @HttpCode(OK)
    @Patch("select-otp-channel")
    @FormatResponse(SuccessMessageDTO)
    @RequirePermission(RECIPIENT_SELECT_OTP_CHANNEL)
    @ApiOperation({
        summary: "Selects which verified channel receives OTP codes",
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
    public selectOtpChannel(
        @Body() input: SelectOtpChannelBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Recipient.SelectOtpChannel.Result {
        return this.recipientCommands.selectOtpChannel({ context, actor, input });
    }
}
