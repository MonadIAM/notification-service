import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { BaseListDTO } from "~common/dto";

import { ChannelDTO } from "./entity.dto";

@ApiSchema({ name: "ChannelList" })
export class ListDTO extends BaseListDTO<ChannelDTO> {
    @Type(() => ChannelDTO)
    @ApiProperty({ required: true, type: [ChannelDTO] })
    declare public data: ChannelDTO[];
}
