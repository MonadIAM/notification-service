import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { Validator } from "~common/validator";
import { ChannelType } from "~context/enums";

@ApiSchema({ name: "Channel" })
export class ChannelDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public id: string;

    @Expose()
    @Validator.IsEnum(ChannelType)
    @ApiProperty({ required: true, enum: ChannelType, enumName: "ChannelType" })
    declare public type: ChannelType;

    @Expose()
    @ApiProperty({ required: false, type: String })
    declare public address?: string;

    @Expose()
    @Validator.IsBoolean()
    @ApiProperty({ required: true, type: Boolean })
    declare public isVerified: boolean;

    @Expose()
    @Validator.IsBoolean()
    @ApiProperty({ required: false, type: Boolean })
    declare public soundEnabled?: boolean;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public verifiedAt?: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public updatedAt?: Date;
}
