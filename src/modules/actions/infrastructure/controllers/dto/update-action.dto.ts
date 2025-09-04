import { ApiProperty } from '@nestjs/swagger';
import { UpdateActionCommand } from '../../../application/commands/update-action.command';

export class UpdateActionDto {
  @ApiProperty({ description: 'Action points', example: 2 })
  actionPoints: number;

  static toCommand(id: string, dto: UpdateActionDto, userId: string, roles: string[]): UpdateActionCommand {
    return new UpdateActionCommand(dto.actionPoints, userId, roles);
  }
}
