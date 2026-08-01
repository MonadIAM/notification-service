import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { BaseListDTO } from "~common/dto";

import { PreferenceDTO } from "./entity.dto";

@ApiSchema({ name: "PreferenceList" })
export class ListDTO extends BaseListDTO<PreferenceDTO> {
    @Type(() => PreferenceDTO)
    @ApiProperty({ required: true, type: [PreferenceDTO] })
    declare public data: PreferenceDTO[];
}
