import { IsNotEmptyObject, ValidateIf } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { PaginationDTO } from "~common/dto";
import { Validator } from "~common/validator";
import { QueryMode } from "~context/enums";

import { ManageFiltersDTO } from "../utils/filters.dto";
import { SortDTO } from "../utils/sort.dto";

@ApiSchema({ name: "MessageManageListQuery" })
export class ManageGetListQueryDTO {
    public get mode(): QueryMode.MANAGE {
        return QueryMode.MANAGE;
    }
}

@ApiSchema({ name: "MessageManageListBody" })
export class ManageGetListBodyDTO {
    @Expose()
    @ValidateIf(({ pagination }) => pagination)
    @IsNotEmptyObject()
    @Validator.ValidateNested()
    @Type(() => PaginationDTO)
    @ApiProperty({ required: true, type: PaginationDTO })
    declare public pagination: PaginationDTO;

    @Expose()
    @ValidateIf(({ filters }) => filters)
    @IsNotEmptyObject()
    @Validator.ValidateNested()
    @Type(() => ManageFiltersDTO)
    @ApiProperty({ required: true, type: ManageFiltersDTO })
    declare public filters: ManageFiltersDTO;

    @Expose()
    @ValidateIf(({ sort }) => sort)
    @IsNotEmptyObject()
    @Validator.ValidateNested()
    @Type(() => SortDTO)
    @ApiProperty({ required: true, type: SortDTO })
    declare public sort: SortDTO;
}
