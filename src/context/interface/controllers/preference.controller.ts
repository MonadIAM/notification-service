import { UseInterceptors, Controller, HttpStatus, HttpCode, Inject, Patch, Query, Body, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Extract, FormatResponse, RequirePermission, Swagger } from "~common/decorators";
import { PREFERENCE_COMMANDS } from "~context/application/commands";
import { PREFERENCE_QUERIES } from "~context/application/queries";
import { MonitoringInterceptor } from "~common/interceptors";
import { SuccessMessageDTO } from "~common/dto";
import { PermissionCode } from "~context/enums";

import { GetListQueryDTO, GetListBodyDTO, ToggleBodyDTO, ListDTO } from "../dto/preference";

const { PREFERENCE_READ_PERSONAL, PREFERENCE_TOGGLE } = PermissionCode;
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

@ApiTags("Preference")
@Controller("/preference")
@UseInterceptors(MonitoringInterceptor)
export class PreferenceController {
    public constructor(
        @Inject(PREFERENCE_COMMANDS)
        private readonly preferenceCommands: Commands.Preference.ControllerContract,
        @Inject(PREFERENCE_QUERIES)
        private readonly preferenceQueries: Queries.Preference.ControllerContract,
    ) {}

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequirePermission(PREFERENCE_READ_PERSONAL)
    @ApiOperation({
        summary: "Returns a paginated list of duplication preferences for the current account",
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
    ): Queries.Preference.FindMany.Result {
        return this.preferenceQueries.findMany({ mode, pagination, filters, sort, actor });
    }

    @HttpCode(OK)
    @Patch("toggle")
    @FormatResponse(SuccessMessageDTO)
    @RequirePermission(PREFERENCE_TOGGLE)
    @ApiOperation({
        summary: "Toggles notification duplication for a channel and category",
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
    public toggle(
        @Body() input: ToggleBodyDTO,
        @Extract.Session() { account: actor }: Extract.Session.Auth,
        @Extract.Meta() context: Extract.Meta,
    ): Commands.Preference.Toggle.Result {
        return this.preferenceCommands.toggle({ context, actor, input });
    }
}
