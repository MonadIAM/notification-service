import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { FailureReason, MessageStatus, ChannelType } from "~context/enums";
import { Validator } from "~common/validator";

@ApiSchema({ name: "Message" })
export class MessageDTO {
    @Expose()
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public id: string;

    @Expose()
    @Transform(({ obj }: { obj: Entities.Message }) => obj.notification?.id)
    @Validator.IsUUID()
    @ApiProperty({ required: true, type: String, format: "uuid" })
    declare public notification: string;

    @Expose()
    @Validator.IsEnum(ChannelType)
    @ApiProperty({ required: true, enum: ChannelType, enumName: "ChannelType" })
    declare public channelType: ChannelType;

    @Expose()
    @Validator.IsString()
    @ApiProperty({ required: true, type: String })
    declare public address: string;

    @Expose()
    @Validator.IsEnum(MessageStatus)
    @ApiProperty({ required: true, enum: MessageStatus, enumName: "MessageStatus" })
    declare public status: MessageStatus;

    @Expose()
    @Validator.IsInt()
    @ApiProperty({ required: true, type: Number })
    declare public retryCount: number;

    @Expose()
    @Validator.IsEnum(FailureReason)
    @ApiProperty({ required: false, enum: FailureReason, enumName: "FailureReason" })
    declare public failureReason?: FailureReason;

    @Expose()
    @ApiProperty({ required: false, type: String })
    declare public error?: string;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public sentAt?: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public deliveredAt?: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public failedAt?: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: false, type: Date })
    declare public readAt?: Date;

    @Expose()
    @Validator.IsDate()
    @ApiProperty({ required: true, type: Date })
    declare public createdAt: Date;
}
