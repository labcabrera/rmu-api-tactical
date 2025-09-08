import { ApiProperty } from '@nestjs/swagger';
import { UpdateActionCommand } from '../../../application/cqrs/commands/update-action.command';

export class UpdateActionDto {
  @ApiProperty({ description: 'Action description', example: 'Attack the enemy' })
  description: string | undefined;

  static toCommand(id: string, dto: UpdateActionDto, userId: string, roles: string[]): UpdateActionCommand {
    return new UpdateActionCommand(dto.description, userId, roles);
  }
}
