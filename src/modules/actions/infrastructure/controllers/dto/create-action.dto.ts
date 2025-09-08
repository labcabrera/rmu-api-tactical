import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateActionCommand } from '../../../application/commands/create-action.command';
import type { ActionType } from '../../../domain/entities/action-type.vo';
import type { ManeuverType } from '../../../domain/entities/maneuver-type.vo';

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

  @ApiProperty({ description: 'Maneuver type' })
  @IsString()
  @IsNotEmpty()
  maneuverType: ManeuverType;
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

  @ApiProperty({ description: 'Action type' })
  @IsString()
  @IsNotEmpty()
  actionType: ActionType;

  @ApiProperty({ description: 'Phase start' })
  @IsNumber()
  phaseStart: number;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverCreationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionManeuverCreationDto)
  @IsObject()
  maneuver: ActionManeuverCreationDto | undefined;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    const command = new CreateActionCommand();
    command.gameId = dto.gameId;
    command.actorId = dto.actorId;
    command.actionType = dto.actionType;
    command.phaseStart = dto.phaseStart;
    command.maneuver = dto.maneuver;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
