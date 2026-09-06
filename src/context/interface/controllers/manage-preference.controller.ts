import { Controller, HttpStatus, HttpCode, Inject, Query, Body, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { PREFERENCE_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetListQueryDTO, ManageGetListBodyDTO, ListDTO } from "../dto/preference";

const { PREFERENCE_READ_ABSOLUTE } = PermissionCode;
const { INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, SERVICE_UNAVAILABLE, REQUEST_TIMEOUT, UNAUTHORIZED, FORBIDDEN, OK } =
    HttpStatus;

@ApiTags("Preference")
@Controller("/preference/manage")
export class PreferenceManageController {
    public constructor(
        @Inject(PREFERENCE_QUERIES)
        private readonly preferenceQueries: Queries.Preference.ControllerContract,
    ) {}

    @HttpCode(OK)
    @Post("list")
    @FormatResponse(ListDTO)
    @RequireGlobalPermission(PREFERENCE_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns a paginated list of duplication preferences across all accounts",
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
    ): Queries.Preference.FindMany.Result {
        return this.preferenceQueries.findMany({ mode, pagination, filters, sort });
    }
}
