import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { ActorResistanceRoll } from '../../../application/cqrs/handlers/resistance-roll.handler.js';
import {
  RESISTANCE_KINDS,
  RESISTANCE_REASONS,
  type ResistanceKind,
  type ResistanceReason,
} from '../../../domain/services/resistance-roll.calculator.js';
import { FEAR_STATES } from '../../../domain/value-objects/psychology-tables.vo.js';

export class ResistanceModifierDto {
  @ApiProperty({ example: 'leader' })
  @IsString()
  key: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  value: number;

  @ApiProperty({ required: false, description: 'Breakdown group (responses only)', example: 'skill' })
  @IsOptional()
  @IsString()
  group?: 'skill' | 'target' | 'penalty' | 'situation';

  @ApiProperty({ required: false, description: 'Rule reference (responses only)', example: '§14.3' })
  @IsOptional()
  @IsString()
  rule?: string;
}

export class ResistanceRollDto {
  @ApiProperty({ type: String, enum: RESISTANCE_KINDS, example: 'fear' })
  @IsIn(RESISTANCE_KINDS)
  kind: ResistanceKind;

  @ApiProperty({ description: 'Level of the attack: the fright level for fear', example: 5 })
  @IsNumber()
  attackLevel: number;

  @ApiProperty({ description: 'Open-ended roll', example: 42 })
  @IsNumber()
  roll: number;

  @ApiProperty({ type: [ResistanceModifierDto], required: false, description: 'Other modifiers of the game master' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResistanceModifierDto)
  modifiers?: ResistanceModifierDto[];

  @ApiProperty({ required: false, description: 'RR bonus, for an actor without one in its sheet (NPCs); it wins over the sheet' })
  @IsOptional()
  @IsNumber()
  bonus?: number;

  @ApiProperty({
    type: String,
    enum: RESISTANCE_REASONS,
    required: false,
    description: 'frenzy-dying (spec 040): physical RR at attack level 0 of a frenzy-dying actor, that dies when it fails',
  })
  @IsOptional()
  @IsIn(RESISTANCE_REASONS)
  reason?: ResistanceReason;
}

export class ResistanceRollResultDto {
  @ApiProperty()
  actorRoundId: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty({ type: String, enum: RESISTANCE_KINDS })
  kind: string;

  @ApiProperty()
  roll: number;

  @ApiProperty({ description: 'RR bonus used' })
  bonus: number;

  @ApiProperty()
  attackLevel: number;

  @ApiProperty({ type: [ResistanceModifierDto], description: 'Every term of the total' })
  breakdown: ResistanceModifierDto[];

  @ApiProperty()
  total: number;

  @ApiProperty({ description: 'Total needed to resist' })
  required: number;

  @ApiProperty()
  resisted: boolean;

  @ApiProperty({ description: 'How much the total fell short; 0 when it resisted' })
  failure: number;

  @ApiProperty({ required: false, description: 'Result key of the resistance table (mild-failure...)' })
  result?: string;

  @ApiProperty({ required: false, enum: ['mild', 'moderate', 'severe', 'extreme'] })
  severity?: string;

  @ApiProperty({ required: false, enum: FEAR_STATES, description: 'Fear: the state the failure gives' })
  fearState?: string;

  @ApiProperty({ required: false, description: 'Fear: rally modifier of that state' })
  rallyModifier?: number;

  static from(roll: ActorResistanceRoll): ResistanceRollResultDto {
    const dto = new ResistanceRollResultDto();
    dto.actorRoundId = roll.actorRound.id;
    dto.actorId = roll.actorRound.actorId;
    dto.bonus = roll.bonus;
    dto.attackLevel = roll.attackLevel;
    Object.assign(dto, roll.result);
    return dto;
  }
}
