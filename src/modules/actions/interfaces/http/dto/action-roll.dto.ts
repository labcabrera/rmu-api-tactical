import { ApiProperty } from '@nestjs/swagger';
import { ActionRoll } from '../../../domain/value-objects/action-roll.vo';

export class ActionRollDto {
  @ApiProperty({ description: 'Action roll', example: '42' })
  roll?: number;

  static fromEntity(entity: ActionRoll): ActionRollDto {
    const dto = new ActionRollDto();
    dto.roll = entity.roll;
    return dto;
  }
}
