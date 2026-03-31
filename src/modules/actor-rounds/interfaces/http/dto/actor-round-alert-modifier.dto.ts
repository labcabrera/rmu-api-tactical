import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundAlertModifier } from '../../../domain/value-objets/actor-round-alert-modifier.vo';

export class ActorRoundAlertModifierDto {
  constructor(key: string, value: number, modifier: string) {
    this.key = key;
    this.value = value;
    this.modifier = modifier;
  }

  @ApiProperty({ description: 'Key of the modifier', example: 'strength' })
  key: string;

  @ApiProperty({ description: 'Value of the modifier', example: 10 })
  value: number;

  @ApiProperty({ description: 'Modifier description', example: 'increase' })
  modifier: string;

  static fromEntity(entity: ActorRoundAlertModifier): ActorRoundAlertModifierDto {
    return new ActorRoundAlertModifierDto(entity.key, entity.value, entity.modifier);
  }
}
