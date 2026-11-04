import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../application/cqrs/commands/resolve-maneuver.command.js';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import type { LightManeuverModifier } from '../../../domain/value-objects/light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import {
  MANEUVER_PURPOSES,
  type ManeuverPurpose,
  PRECISION_POSITIONS,
  type PrecisionPosition,
} from '../../../domain/value-objects/maneuver-purpose.vo.js';

export class ManeuverRollDto {
  @ApiProperty({ description: 'Total of the open-ended roll', example: 87 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'First die, unmodified (66 is an unusual event)', example: 66, required: false })
  @IsOptional()
  @IsNumber()
  unmodified?: number;

  @ApiProperty({
    description: 'Every die of the open-ended roll (spec 076): checked with the roll profile of the actor (err-roll-open-ended-invalid)',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  dice?: number[];
}

/** @deprecated Body of the resolve request before spec 010. Read for one more version. */
export class LegacyResolveManeuverModifiersDto {
  @ApiProperty({ type: String, description: 'The difficulty of the maneuver', example: 'h', required: false })
  difficulty?: Difficulty;

  @ApiProperty({ type: String, description: 'How the maneuver uses light', example: 'helpful', required: false })
  lightModifier?: LightManeuverModifier;

  @ApiProperty({ type: String, description: 'The type of light', example: 'dark', required: false })
  light?: LightType;

  @ApiProperty({ description: 'Ignored: the armor penalty comes from the character sheet', required: false })
  armorModifier?: boolean;

  @ApiProperty({ description: 'Custom bonus to apply to the maneuver roll', example: 10, required: false })
  customBonus?: number;
}

export class ResolveManeuverDto {
  @ApiProperty({ description: 'Skill to roll with, when it changes from the declared one', required: false })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiProperty({ description: 'Specialization of the skill', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({
    type: String,
    description: 'Maneuver type, when it changes from the declared one',
    enum: ['absolute', 'percent'],
    required: false,
  })
  @IsOptional()
  @IsIn(['absolute', 'percent'])
  maneuverType?: ManeuverType;

  @ApiProperty({ type: String, description: 'Difficulty (Table 5-1)', example: 'm', required: false })
  @IsOptional()
  @IsString()
  difficulty?: Difficulty;

  @ApiProperty({ type: String, description: 'Light of the environment, when the skill uses light', example: 'dark', required: false })
  @IsOptional()
  @IsString()
  light?: LightType;

  @ApiProperty({
    description: 'Choices for the skill catalog modifiers by key: option key (choice), boolean (flag) or units (number)',
    example: { 'animal-domestication': 'domesticated' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  selections?: Record<string, ManeuverModifierSelection>;

  @ApiProperty({ description: 'Custom bonus of the game master', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  customBonus?: number;

  @ApiProperty({ description: 'Conflicting maneuver: total of the passive side', example: 134, required: false })
  @IsOptional()
  @IsNumber()
  passiveTotal?: number;

  @ApiProperty({ description: 'Actor of the game the maneuver is against (its sheet gives the passive total)', required: false })
  @IsOptional()
  @IsString()
  targetActorId?: string;

  @ApiProperty({ description: 'Open-ended roll of the target actor, when there is no passiveTotal', required: false })
  @IsOptional()
  @IsNumber()
  passiveRoll?: number;

  @ApiProperty({ description: 'Skill of the target: social-awareness by default, the active skill for Trading', required: false })
  @IsOptional()
  @IsString()
  passiveSkillId?: string;

  @ApiProperty({ description: 'Skill bonus of a target without a sheet (NPC)', required: false })
  @IsOptional()
  @IsNumber()
  passiveBonus?: number;

  @ApiProperty({
    type: String,
    description:
      'What the maneuver is for: Adrenal Focus to enter or leave the frenzy (spec 040), or a combat talent (spec 076): ' +
      'battle-cry (Influence), sense-weakness and study-offense (Perception, 4 AP), precision (Ambush)',
    enum: MANEUVER_PURPOSES,
    required: false,
  })
  @IsOptional()
  @IsIn(MANEUVER_PURPOSES)
  purpose?: ManeuverPurpose;

  @ApiProperty({ description: 'sense-weakness, study-offense, precision (spec 076): the foe', required: false })
  @IsOptional()
  @IsString()
  foeActorId?: string;

  @ApiProperty({ description: 'battle-cry (spec 076): level of the highest level foe, -2 per level', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  foeLevel?: number;

  @ApiProperty({
    type: String,
    description: 'precision (spec 076): -50 rear, -70 flank, -100 front',
    enum: PRECISION_POSITIONS,
    required: false,
  })
  @IsOptional()
  @IsIn(PRECISION_POSITIONS)
  position?: PrecisionPosition;

  @ApiProperty({ description: 'precision (spec 076): OB given up to the attack, which makes the maneuver as much easier', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  obPenalty?: number;

  @ApiProperty({
    description: 'Spasm (spec 076): rounds of the spasm of a natural 66 (d10); the API rolls them when left out',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  spasmRounds?: number;

  @ApiProperty({ description: 'Roll', type: ManeuverRollDto })
  @ValidateNested()
  @Type(() => ManeuverRollDto)
  @IsObject()
  roll: ManeuverRollDto;

  @ApiProperty({ description: 'Deprecated body of the modifiers', type: LegacyResolveManeuverModifiersDto, required: false })
  @IsOptional()
  @IsObject()
  modifiers?: LegacyResolveManeuverModifiersDto;

  static toCommand(actionId: string, dto: ResolveManeuverDto, userId: string, roles: string[]): ResolveManeuverCommand {
    return new ResolveManeuverCommand(
      actionId,
      ResolveManeuverDto.toRequest(dto),
      new ManeuverRoll(dto.roll?.roll, dto.roll?.unmodified, dto.roll?.dice),
      userId,
      roles,
    );
  }

  /** The new fields win; the legacy `modifiers` fills the ones left out. */
  private static toRequest(dto: ResolveManeuverDto): ResolveManeuverRequest {
    const legacy = dto.modifiers ?? {};
    return new ResolveManeuverRequest(
      dto.difficulty ?? legacy.difficulty,
      dto.selections ?? {},
      dto.light ?? legacy.light,
      dto.customBonus ?? legacy.customBonus,
      dto.passiveTotal,
      dto.skillId,
      dto.specialization,
      dto.maneuverType,
      legacy.lightModifier,
      dto.targetActorId
        ? { targetActorId: dto.targetActorId, roll: dto.passiveRoll, skillId: dto.passiveSkillId, bonus: dto.passiveBonus }
        : undefined,
      dto.purpose,
      dto.foeActorId !== undefined || dto.foeLevel !== undefined || dto.position !== undefined || dto.obPenalty !== undefined
        ? { foeActorId: dto.foeActorId, foeLevel: dto.foeLevel, position: dto.position, obPenalty: dto.obPenalty }
        : undefined,
      dto.spasmRounds,
    );
  }
}
