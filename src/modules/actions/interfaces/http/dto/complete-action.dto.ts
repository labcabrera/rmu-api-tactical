import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CompleteActionCommand } from '../../../application/cqrs/commands/complete-action.command.js';
import type { FullDefenseType } from '../../../application/cqrs/commands/complete-action.command.js';

export class CompleteActionDto {
  @ApiProperty({ description: 'Free text kept with the action', required: false, example: 'Draws a dagger' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({
    type: String,
    description: 'Dodge actions only: the 4 AP full defence is a full dodge or a full block (§9.6)',
    required: false,
    enum: ['dodge', 'block'],
    default: 'dodge',
  })
  @IsOptional()
  @IsIn(['dodge', 'block'])
  defenseType?: FullDefenseType;

  static toCommand(actionId: string, dto: CompleteActionDto, userId: string, roles: string[]): CompleteActionCommand {
    return new CompleteActionCommand(actionId, dto.note, userId, roles, dto.defenseType);
  }
}
