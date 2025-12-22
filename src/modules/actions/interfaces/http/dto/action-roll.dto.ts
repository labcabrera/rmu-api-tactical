import { ApiProperty } from '@nestjs/swagger';
import { ActionRoll } from '../../../application/cqrs/commands/action-roll';

export class ActionRollDto {
  @ApiProperty({ description: 'Action roll', example: '42' })
  roll: number;

  static toCommand(dto: ActionRollDto): ActionRoll {
    return new ActionRoll(dto.roll);
  }
}
