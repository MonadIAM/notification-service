import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { BaseListDTO } from "~common/dto";

import { MessageDTO } from "./entity.dto";

@ApiSchema({ name: "MessageList" })
export class ListDTO extends BaseListDTO<MessageDTO> {
    @Type(() => MessageDTO)
    @ApiProperty({ required: true, type: [MessageDTO] })
    declare public data: MessageDTO[];
}
