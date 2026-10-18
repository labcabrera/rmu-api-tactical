import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CompleteActionCommand } from '../../../application/cqrs/commands/complete-action.command';

export class CompleteActionDto {
  @ApiProperty({ description: 'Free text kept with the action', required: false, example: 'Draws a dagger' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  static toCommand(actionId: string, dto: CompleteActionDto, userId: string, roles: string[]): CompleteActionCommand {
    return new CompleteActionCommand(actionId, dto.note, userId, roles);
  }
}
