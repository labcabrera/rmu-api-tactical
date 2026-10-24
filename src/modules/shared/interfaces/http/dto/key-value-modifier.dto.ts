import { ApiProperty } from '@nestjs/swagger';

export class KeyValueModifierDto {
  constructor(key: string, value: number, modifier: string) {
    this.key = key;
    this.value = value;
    this.modifier = modifier;
  }

  @ApiProperty({ description: 'Modifier key', example: 'strength' })
  key: string;

  @ApiProperty({ description: 'Modifier value', example: 2 })
  value: number;

  @ApiProperty({ description: 'Modifier type (e.g., "bonus" or "penalty")', example: 'bonus' })
  modifier: string;
}
