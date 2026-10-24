import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundAlertModifier } from '../../../domain/value-objects/actor-round-alert-modifier.vo.js';

export class ActorRoundAlertModifierDto {
  @ApiProperty({ description: 'Key of the modifier', required: true, example: 'strength' })
  key: string;

  @ApiProperty({ type: Number, description: 'Value of the modifier', required: false, example: 10 })
  value: number | null;

  @ApiProperty({ type: String, description: 'Modifier description', required: false, example: 'increase' })
  modifier: string | null;

  static fromEntity(entity: ActorRoundAlertModifier): ActorRoundAlertModifierDto {
    const dto = new ActorRoundAlertModifierDto();
    dto.key = entity.key;
    dto.value = entity.value;
    dto.modifier = entity.modifier;
    return dto;
  }
}
