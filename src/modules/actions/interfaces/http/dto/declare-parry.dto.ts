import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  DeclareParryCommand,
  DeclareParryItem,
  DeclareShieldManeuverItem,
} from '../../../application/cqrs/commands/declare-parry.command.js';
import { DIFFICULTY_MAP, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import { ABSOLUTE_MANEUVER_RESULTS } from '../../../domain/value-objects/action-attack-parry.vo.js';

export class DeclareParryItemDto {
  @IsString()
  @IsNotEmpty()
  parryId: string;

  @IsNumber()
  parry: number;

  @ApiProperty({
    required: false,
    enum: ABSOLUTE_MANEUVER_RESULTS,
    description:
      'Result of the absolute Combat Training maneuver of a parry against a further foe of the round (spec 079): only a ' +
      'success or better lets the parry count',
  })
  @IsOptional()
  @IsIn(ABSOLUTE_MANEUVER_RESULTS)
  maneuverResult?: string;

  static toCommandItem(dto: DeclareParryItemDto): DeclareParryItem {
    return new DeclareParryItem(dto.parryId, dto.parry, dto.maneuverResult);
  }
}

/** Workspace spec 077, decisions A1.3-A1.4: the Shield maneuver against one attack. */
export class DeclareShieldManeuverItemDto {
  @ApiProperty({ description: 'Attack of the action the maneuver is against', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ required: false, description: 'Open-ended roll of the defender', example: 72 })
  @IsOptional()
  @IsNumber()
  roll?: number;

  @ApiProperty({ type: String, required: false, enum: [...DIFFICULTY_MAP.keys()], description: 'Difficulty (medium when missing)' })
  @IsOptional()
  @IsIn([...DIFFICULTY_MAP.keys()])
  difficulty?: Difficulty;

  @ApiProperty({ required: false, description: 'Game master shortcut without a roll: the maneuver passed or failed' })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  static toCommandItem(dto: DeclareShieldManeuverItemDto): DeclareShieldManeuverItem {
    return new DeclareShieldManeuverItem(dto.attackName, dto.roll, dto.difficulty, dto.passed);
  }
}

export class DeclareParryDto {
  @IsOptional()
  @IsArray()
  public parries: DeclareParryItemDto[];

  @ApiProperty({
    type: [DeclareShieldManeuverItemDto],
    required: false,
    description: 'Shield maneuvers of the defenders, one per attack that needs it (workspace spec 077)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeclareShieldManeuverItemDto)
  public shieldManeuvers?: DeclareShieldManeuverItemDto[];

  static toCommand(actionId: string, dto: DeclareParryDto, userId: string, roles: string[]) {
    return new DeclareParryCommand(
      actionId,
      (dto.parries ?? []).map(e => DeclareParryItemDto.toCommandItem(e)),
      userId,
      roles,
      (dto.shieldManeuvers ?? []).map(e => DeclareShieldManeuverItemDto.toCommandItem(e)),
    );
  }
}
