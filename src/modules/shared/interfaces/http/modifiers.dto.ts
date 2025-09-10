import { ApiProperty } from '@nestjs/swagger';
import { Modifier } from '../../domain/entities/modifier.vo';

export class ModifierDto {
  @ApiProperty({ description: 'Modifier key', example: 'bo' })
  key: string;

  @ApiProperty({ description: 'Modifier value', example: 5 })
  value: number;

  static fromEntity(entity: Modifier): ModifierDto {
    const dto = new ModifierDto();
    dto.key = entity.key;
    dto.value = entity.value;
    return dto;
  }
}
