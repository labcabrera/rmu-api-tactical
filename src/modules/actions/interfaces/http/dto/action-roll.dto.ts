import { ApiProperty } from '@nestjs/swagger';
import { ActionRoll } from '../../../domain/value-objects/action-roll.vo';
import { KeyValueModifierDto } from './key-value-modifier.dto';

export class ActionRollDto {
  modifiers?: KeyValueModifierDto[] | undefined;

  @ApiProperty({ description: 'Action roll', example: '42' })
  roll: number | undefined;

  totalRoll: number | undefined;

  static fromEntity(entity: ActionRoll): ActionRollDto {
    const dto = new ActionRollDto();
    dto.modifiers = entity.modifiers?.map((mod) => KeyValueModifierDto.fromEntity(mod));
    dto.roll = entity.roll;
    dto.totalRoll = entity.totalRoll;
    return dto;
  }
}
