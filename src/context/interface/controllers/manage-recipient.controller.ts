import { Controller, HttpStatus, HttpCode, Inject, Query, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireGlobalPermission, FormatResponse, Swagger } from "~common/decorators";
import { RECIPIENT_QUERIES } from "~context/application/queries";
import { PermissionCode } from "~context/enums";

import { ManageGetByIdQueryDTO, RecipientDTO } from "../dto/recipient";

const { RECIPIENT_READ_ABSOLUTE } = PermissionCode;
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

@ApiTags("Recipient")
@Controller("/recipient/manage")
export class RecipientManageController {
    public constructor(
        @Inject(RECIPIENT_QUERIES)
        private readonly recipientQueries: Queries.Recipient.ControllerContract,
    ) {}

    @Get()
    @HttpCode(OK)
    @FormatResponse(RecipientDTO)
    @RequireGlobalPermission(RECIPIENT_READ_ABSOLUTE)
    @ApiOperation({
        summary: "Returns the recipient profile of any account",
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
    public findUnique(@Query() { account, mode }: ManageGetByIdQueryDTO): Queries.Recipient.FindUnique.Result {
        return this.recipientQueries.findUnique({ mode, account });
    }
}
