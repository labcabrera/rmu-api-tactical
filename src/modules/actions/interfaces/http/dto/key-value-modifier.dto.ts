import { ApiProperty } from '@nestjs/swagger';
import type { ModifierGroup, ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';

export class KeyValueModifierDto {
  @ApiProperty({ description: 'Key of the modifier', example: 'difficulty' })
  key: string;

  @ApiProperty({ description: 'Value of the modifier', example: 10 })
  value: number;

  @ApiProperty({
    type: String,
    description: 'Breakdown group of the modifier',
    enum: ['offense', 'defense', 'situation', 'critical', 'resolution'],
    required: false,
  })
  group?: ModifierGroup;

  @ApiProperty({ description: 'Combat plugin that added the modifier', example: 'cover', required: false })
  source?: string;

  @ApiProperty({ description: 'Rule reference of the plugin', example: '§9.6', required: false })
  rule?: string;

  @ApiProperty({
    description: 'Inputs of the value, for its explanation',
    example: { mode: 'partial', skill: 25, injury: -13 },
    required: false,
    type: Object,
  })
  params?: ModifierParams;

  static fromEntity(entity: KeyValueModifier): KeyValueModifierDto {
    const dto = new KeyValueModifierDto();
    dto.key = entity.key;
    dto.value = entity.value;
    dto.group = entity.group;
    dto.source = entity.source;
    dto.rule = entity.rule;
    dto.params = entity.params;
    return dto;
  }
}
