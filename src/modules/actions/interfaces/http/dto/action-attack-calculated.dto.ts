import { ApiProperty } from '@nestjs/swagger';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { KeyValueModifierDto } from './key-value-modifier.dto';

export class ActionAttackCalculatedDto {
  @ApiProperty({ description: 'Total attack value after applying all modifiers' })
  rollModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Sum of all modifiers', example: 42 })
  rollTotal: number;

  @ApiProperty({ description: 'Whether a location roll is required', required: true, example: false })
  requiredLocationRoll: boolean;

  @ApiProperty({ description: 'The location hit by the attack', required: false })
  location: AttackLocation | undefined;

  static fromEntity(entity: ActionAttackCalculatedDto): ActionAttackCalculatedDto {
    const dto = new ActionAttackCalculatedDto();
    dto.rollModifiers = entity.rollModifiers ? entity.rollModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.rollTotal = entity.rollTotal;
    dto.location = entity.location;
    dto.requiredLocationRoll = entity.requiredLocationRoll;
    return dto;
  }
}
