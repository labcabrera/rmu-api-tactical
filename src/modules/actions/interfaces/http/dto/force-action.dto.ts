import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ManageActionPointsCommand } from '../../../application/cqrs/commands/manage-action-points.command.js';
import { FORCE_REASONS } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ForceReason } from '../../../domain/value-objects/action-resolution.vo.js';

export class ForceResolutionDto {
  @ApiProperty({
    type: String,
    description:
      'Why the action is resolved out of turn: withdrawal and pass-through take the next free AP (the action needs one ' +
      'spent), effect takes none and no AP penalty, gm keeps the AP spent',
    enum: FORCE_REASONS,
  })
  @IsIn(FORCE_REASONS)
  reason: ForceReason;

  @ApiProperty({ description: 'Note of the game master', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  static toCommand(actionId: string, dto: ForceResolutionDto, userId: string, roles: string[]): ManageActionPointsCommand {
    return new ManageActionPointsCommand(actionId, 'force', userId, roles, dto.reason, dto.note);
  }
}
