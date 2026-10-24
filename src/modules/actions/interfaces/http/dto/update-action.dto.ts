import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UpdateActionCommand } from '../../../application/cqrs/commands/update-action.command';

export class UpdateActionDto {
  @ApiProperty({ type: String, description: 'Action description', example: 'Attack the enemy', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description: string | undefined;

  static toCommand(id: string, dto: UpdateActionDto, userId: string, roles: string[]): UpdateActionCommand {
    return new UpdateActionCommand(id, dto.description, userId, roles);
  }
}
