import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { QueryMode } from "~context/enums";

@ApiSchema({ name: "MessageManageGetByIdQuery" })
export class ManageGetByIdQueryDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public message: string;

    public get mode(): QueryMode.MANAGE {
        return QueryMode.MANAGE;
    }
}
