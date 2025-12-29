import { ApiProperty } from '@nestjs/swagger';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';

export class KeyValueModifierDto {
  @ApiProperty({ description: 'Key of the modifier', example: 'difficulty' })
  key: string;

  @ApiProperty({ description: 'Value of the modifier', example: 10 })
  value: number;

  static fromEntity(entity: KeyValueModifier): KeyValueModifierDto {
    const dto = new KeyValueModifierDto();
    dto.key = entity.key;
    dto.value = entity.value;
    return dto;
  }
}
