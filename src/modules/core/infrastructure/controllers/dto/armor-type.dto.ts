import { ApiProperty } from '@nestjs/swagger';
import { ArmorType } from 'src/modules/core/domain/entities/armor-type';

export class ArmorTypeDto {
  @ApiProperty({ description: 'Unique identifier of the armor type', example: 3 })
  id: number;

  @ApiProperty({ description: 'Name of the armor type', example: 'Soft Leather' })
  name: string;

  static fromEntity(entity: ArmorType): ArmorTypeDto {
    const dto = new ArmorTypeDto();
    dto.id = entity.id;
    dto.name = entity.name;
    return dto;
  }
}
