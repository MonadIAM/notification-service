import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { NotificationCategory, PlatformService, ChannelType } from "~context/enums";
import { Validator } from "~common/validator";

import { MessageDTO } from "../../message";

@ApiSchema({ name: "Notification" })
export class NotificationDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public id: string;

    @Expose()
    @Validator.IsEnum(NotificationCategory)
    @ApiProperty({ required: true, enum: NotificationCategory, enumName: "NotificationCategory" })
    declare public category: NotificationCategory;

    @Expose()
    @Validator.IsEnum(PlatformService)
    @ApiProperty({ required: true, enum: PlatformService, enumName: "PlatformService" })
    declare public sourceService: PlatformService;

    @Expose()
    @ApiProperty({ required: false, type: String })
    declare public realm?: string;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public template: string;

    @Expose()
    @ApiProperty({ required: false, type: String })
    declare public title?: string;

    @Expose()
    @ApiProperty({ required: false, type: String })
    declare public body?: string;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;

    @Expose()
    @Type(() => MessageDTO)
    @Validator.IsOptional()
    @Validator.ValidateNested()
    @ApiProperty({ required: true, type: MessageDTO, nullable: true })
    declare public message: Nullable<MessageDTO>;

    @Expose()
    @Validator.IsArray()
    @Validator.IsEnum(ChannelType, { each: true })
    @ApiProperty({ required: true, enum: ChannelType, enumName: "ChannelType", isArray: true })
    declare public duplicatedTo: ChannelType[];
}
