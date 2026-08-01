import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { NotificationCategory, ChannelType } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "PreferenceToggleBody" })
export class ToggleBodyDTO {
    @Expose()
    @Validator.IsEnum(ChannelType)
    @ApiProperty({ required: true, enum: ChannelType, enumName: "ChannelType" })
    declare public channelType: ChannelType;

    @Expose()
    @Validator.IsEnum(NotificationCategory)
    @ApiProperty({ required: true, enum: NotificationCategory, enumName: "NotificationCategory" })
    declare public category: NotificationCategory;
}
