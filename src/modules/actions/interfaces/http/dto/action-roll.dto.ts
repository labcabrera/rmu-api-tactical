import { ApiProperty } from '@nestjs/swagger';
import { ActionRoll } from '../../../domain/value-objects/action-roll.vo.js';
import { KeyValueModifierDto } from './key-value-modifier.dto.js';
import { SkippedRuleDto } from './skipped-rule.dto.js';

export class ActionRollDto {
  modifiers?: KeyValueModifierDto[] | undefined;

  @ApiProperty({ type: Number, description: 'Action roll', example: '42' })
  roll: number | null;

  totalRoll: number | null;

  @ApiProperty({ description: 'Rules that did not apply to the roll, and why', type: [SkippedRuleDto], required: false })
  skipped?: SkippedRuleDto[];

  static fromEntity(entity: ActionRoll): ActionRollDto {
    const dto = new ActionRollDto();
    dto.modifiers = entity.modifiers?.map(mod => KeyValueModifierDto.fromEntity(mod));
    dto.roll = entity.roll;
    dto.totalRoll = entity.totalRoll;
    dto.skipped = entity.skipped?.map(rule => SkippedRuleDto.fromEntity(rule));
    return dto;
  }
}
