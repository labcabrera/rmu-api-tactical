import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
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

  @ApiProperty({ description: 'Character items', type: [ActionAttackCreationDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => ActionAttackCreationDto)
  @IsArray()
  attacks: ActionAttackCreationDto[] | undefined;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    return new CreateActionCommand(
      dto.gameId,
      dto.characterId,
      dto.actionType,
      dto.phaseStart,
      dto.actionPoints,
      dto.attacks,
      userId,
      roles,
    );
  }
}
