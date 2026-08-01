import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { QueryMode } from "~context/enums";

@ApiSchema({ name: "RecipientManageGetByIdQuery" })
export class ManageGetByIdQueryDTO {
    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public account: string;

    public get mode(): QueryMode.MANAGE {
        return QueryMode.MANAGE;
    }
}
