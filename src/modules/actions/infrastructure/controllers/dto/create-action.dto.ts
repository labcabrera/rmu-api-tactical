import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateActionCommand } from '../../../application/commands/create-action.command';
import * as actionEntity from '../../../domain/entities/action.entity';

export class ActionAttackCreationDto {
  @ApiProperty({ description: 'Attack type' })
  @IsString()
  @IsNotEmpty()
  attackType: string;

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
  maneuverType: actionEntity.ManeuverType;
}

export class CreateActionDto {
  @ApiProperty({ description: 'Game identifier' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Character identifier' })
  @IsString()
  @IsNotEmpty()
  characterId: string;

  @ApiProperty({ description: 'Action type' })
  @IsString()
  @IsNotEmpty()
  actionType: actionEntity.ActionType;

  @ApiProperty({ description: 'Phase start' })
  @IsNumber()
  phaseStart: number;

  @ApiProperty({ description: 'Action points' })
  @IsNumber()
  actionPoints: number;

  @ApiProperty({ description: 'Action attacks', type: [ActionAttackCreationDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActionAttackCreationDto)
  @IsArray()
  attacks: ActionAttackCreationDto[] | undefined;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverCreationDto })
  @ValidateNested()
  @Type(() => ActionManeuverCreationDto)
  @IsObject()
  maneuver: ActionManeuverCreationDto | undefined;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    const command = new CreateActionCommand();
    command.gameId = dto.gameId;
    command.characterId = dto.characterId;
    command.actionType = dto.actionType;
    command.phaseStart = dto.phaseStart;
    command.actionPoints = dto.actionPoints;
    command.attacks = dto.attacks;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
