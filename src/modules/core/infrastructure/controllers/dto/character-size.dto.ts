import { ApiProperty } from '@nestjs/swagger';

import { CharacterSize } from 'src/modules/core/domain/entities/character-size';

export class CharacterSizeDto {
  @ApiProperty({ description: 'Unique identifier of the character size', example: 'medium' })
  id: string;

  @ApiProperty({ description: 'Index of the character size', example: 1 })
  index: number;

  @ApiProperty({ description: 'Name of the character size', example: 'Medium' })
  name: string;

  @ApiProperty({ description: 'Hit multiplier for the character size', example: 1.0 })
  hitMultiplier: number;

  static fromEntity(entity: CharacterSize): CharacterSizeDto {
    const dto = new CharacterSizeDto();
    dto.id = entity.id;
    dto.index = entity.index;
    dto.name = entity.name;
    dto.hitMultiplier = entity.hitMultiplier;
    return dto;
  }
}
