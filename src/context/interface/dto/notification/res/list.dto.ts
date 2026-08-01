import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { BaseListDTO } from "~common/dto";

import { NotificationDTO } from "./entity.dto";

@ApiSchema({ name: "NotificationList" })
export class ListDTO extends BaseListDTO<NotificationDTO> {
    @Type(() => NotificationDTO)
    @ApiProperty({ required: true, type: [NotificationDTO] })
    declare public data: NotificationDTO[];
}
