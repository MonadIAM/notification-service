import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { QueryMode } from "~context/enums";

@ApiSchema({ name: "ChannelGetByIdQuery" })
export class GetByIdQueryDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public channel: string;

    public get mode(): QueryMode.DEFAULT {
        return QueryMode.DEFAULT;
    }
}

@ApiSchema({ name: "ChannelManageGetByIdQuery" })
export class ManageGetByIdQueryDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public channel: string;

    public get mode(): QueryMode.MANAGE {
        return QueryMode.MANAGE;
    }
}
