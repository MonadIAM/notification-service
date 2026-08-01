import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { NotificationCategory, ChannelType } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "Preference" })
export class PreferenceDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public id: string;

    @Expose()
    @Validator.IsEnum(ChannelType)
    @ApiProperty({ required: true, enum: ChannelType, enumName: "ChannelType" })
    declare public channelType: ChannelType;

    @Expose()
    @Validator.IsEnum(NotificationCategory)
    @ApiProperty({ required: true, enum: NotificationCategory, enumName: "NotificationCategory" })
    declare public category: NotificationCategory;

    @Expose()
    @Validator.IsBoolean()
    @ApiProperty({ required: true, type: Boolean })
    declare public isDuplicationEnabled: boolean;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public updatedAt?: Date;
}
