import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateActionCommand } from '../../../application/cqrs/commands/create-action.command.js';
import { FORCE_REASONS } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ForceReason } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';

export class ActionAttackCreationDto {
  @ApiProperty({ description: 'Attack type' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Target identifier' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: 'Parry value' })
  @IsNumber()
  parry: number;
}

export class ActionManeuverCreationDto {
  @ApiProperty({ description: 'Skill identifier' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({
    type: String,
    description: 'Maneuver type; the skill profile one when left out',
    enum: ['absolute', 'percent'],
    required: false,
  })
  @IsOptional()
  @IsIn(['absolute', 'percent'])
  maneuverType?: ManeuverType;

  @ApiProperty({ description: 'Specialization of the skill', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'Unfinished percent maneuver of the actor that this one continues', required: false })
  @IsOptional()
  @IsString()
  continuesActionId?: string;
}

export class ForceActionDto {
  @ApiProperty({ type: String, description: 'Why the action is resolved out of turn', enum: FORCE_REASONS })
  @IsIn(FORCE_REASONS)
  reason: ForceReason;

  @ApiProperty({ description: 'Note of the game master', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateActionDto {
  @ApiProperty({ description: 'Game identifier' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Character identifier' })
  @IsString()
  @IsNotEmpty()
  actorId: string;

  @ApiProperty({ type: String, description: 'Action type' })
  @IsString()
  @IsNotEmpty()
  actionType: ActionType;

  @ApiProperty({ description: 'Instantaneous action (not allowed on attacks)', default: false, example: false })
  @IsOptional()
  @IsBoolean()
  freeAction: boolean = false;

  @ApiProperty({ description: 'Phase start' })
  @IsNumber()
  phaseStart: number;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverCreationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionManeuverCreationDto)
  @IsObject()
  maneuver: ActionManeuverCreationDto | undefined;

  @ApiProperty({
    description: 'A new action resolved out of turn (an effect or the game master): it takes no AP and skips the phase checks',
    type: ForceActionDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ForceActionDto)
  @IsObject()
  forced?: ForceActionDto;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    return new CreateActionCommand(
      dto.gameId,
      dto.actorId,
      dto.actionType,
      dto.freeAction,
      dto.phaseStart,
      dto.maneuver,
      '',
      userId,
      roles,
      dto.forced ? { reason: dto.forced.reason, note: dto.forced.note } : undefined,
    );
  }
}
