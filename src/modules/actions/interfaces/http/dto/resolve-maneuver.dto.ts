import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { GrappleEscapeRow } from '../../../domain/services/grapple-escape.js';
import {
  type ComplementaryChoice,
  SIMILARITY_VALUES,
  type SimilarityChoice,
  type SimilarityValue,
  SKILL_RELATIONS,
  type SkillRelation,
} from '../../../domain/services/skill-aids.js';
import {
  MISSING_SENSE_HELPFUL_DEFAULT,
  MISSING_SENSE_HELPFUL_MIN,
  HEATSENSE_MAX,
  SENSE_SELECTIONS,
  SENSE_USAGES,
  SENSES,
  type Sense,
  type SenseSelection,
  type SenseChoices,
  type SenseUsage,
} from '../../../../shared/domain/senses/sense-modifiers.js';
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

/** One roll of a grapple escape, against one grapple of the actor (workspace spec 077, decision A3.3). */
export class GrappleEscapeRowDto {
  @ApiProperty({ description: 'The grappled effect of the actor to escape from' })
  @IsString()
  effectId: string;

  @ApiProperty({ description: 'Total of the open-ended roll of the actor against this grapple', example: 74 })
  @IsNumber()
  roll: number;

  @ApiProperty({
    type: String,
    description: 'Difficulty the game master picks (from the relative weight); the body difficulty or medium when left out',
    required: false,
  })
  @IsOptional()
  @IsString()
  difficulty?: Difficulty;

  @ApiProperty({
    description: "Total of the grappler's side of the contested roll (required unless the grapple is an object): adds 100 less it",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  passiveTotal?: number;
}

/** Workspace spec 079, decision B1: the skill the maneuver needs, when the actor rolls a similar one (Table 3-0c). */
export class SimilarityDto {
  @ApiProperty({ description: 'Skill the maneuver needs; the one rolled is similar to it', example: 'perception' })
  @IsString()
  targetSkillId: string;

  @ApiProperty({ type: String, description: 'Specialization of the skill needed', required: false, nullable: true })
  @IsOptional()
  @IsString()
  targetSpecialization?: string | null;

  @ApiProperty({ description: 'Very similar (0), similar (-25) or slightly similar (-50)', enum: SIMILARITY_VALUES, example: -25 })
  @IsIn([...SIMILARITY_VALUES])
  similarity: SimilarityValue;

  @ApiProperty({
    type: String,
    description: 'Relation the game master rules; read from the skill categories when left out (-25, -50, -75)',
    enum: SKILL_RELATIONS,
    required: false,
  })
  @IsOptional()
  @IsIn(SKILL_RELATIONS)
  relation?: SkillRelation;
}

/** Workspace spec 079, decision B1: a helper of a complementary skill, an actor of the same game. */
export class ComplementaryHelperDto {
  @ApiProperty({ description: 'Actor of the same tactical game that helps; the one who rolls when left out', required: false })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ description: 'Skill whose ranks help', example: 'traps' })
  @IsString()
  skillId: string;

  @ApiProperty({ type: String, description: 'Specialization of the skill', required: false, nullable: true })
  @IsOptional()
  @IsString()
  specialization?: string | null;
}

/** Workspace spec 079, decision B2: the load of a feat of strength (§5.2). */
export class FeatOfStrengthDto {
  @ApiProperty({ description: 'Weight of the load in pounds', example: 100 })
  @IsNumber()
  @Min(0.01)
  loadWeight: number;

  @ApiProperty({ description: 'Part of the weight left by the mechanical advantage (0.01-1, 0.5 dragged)', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  mechanicalFactor?: number;

  @ApiProperty({ description: 'Body weight in pounds of an actor without a sheet that gives it (NPC)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  bodyWeight?: number;

  @ApiProperty({ description: 'St bonus of an actor without a sheet that gives it (NPC); 0 when left out', required: false })
  @IsOptional()
  @IsInt()
  strengthBonus?: number;
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

  @ApiProperty({
    type: String,
    description: 'Light of the environment, when the skill uses light; the ambient light of the game when left out (spec 076)',
    example: 'dark',
    required: false,
  })
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
      'battle-cry (Influence), sense-weakness and study-offense (Perception, 4 AP), precision (Ambush); or grapple-escape ' +
      '(spec 077: unarmed-st, unarmed-ag or contortions, percent, 2-4 AP, with grappleEscape rows) or fall-control ' +
      '(spec 077: acrobatics, absolute, instantaneous or forced, 0 AP, medium by default); feat-of-strength (spec 079: ' +
      'weight-training with featOfStrength, difficulty of Table 5-2), adrenal (spec 079: adrenal-defense, -focus, -speed ' +
      'or -strength, absolute, Table 3-4, benefit from the next round) or fortitude (spec 079: fortitude, absolute, ' +
      'instantaneous or forced, 0 AP, Table 3-4)',
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

  @ApiProperty({
    type: String,
    description: 'Perception and Tracking (spec 076): the sense used, vision by default (err-maneuver-sense-not-allowed for other skills)',
    enum: SENSES,
    required: false,
  })
  @IsOptional()
  @IsIn(SENSES)
  sense?: Sense;

  @ApiProperty({
    type: String,
    description: 'Perception and Tracking (spec 076): the maneuver requires the sense (default) or the sense only helps',
    enum: SENSE_USAGES,
    required: false,
  })
  @IsOptional()
  @IsIn(SENSE_USAGES)
  senseUsage?: SenseUsage;

  @ApiProperty({
    description: 'Perception and Tracking (spec 076): situations of the sense talents',
    enum: SENSE_SELECTIONS,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SENSE_SELECTIONS.length)
  @IsIn(SENSE_SELECTIONS, { each: true })
  senseSelections?: SenseSelection[];

  @ApiProperty({ description: 'Missing Sense where the sense helps (spec 076): -20 by default, -50 to -20', required: false })
  @IsOptional()
  @IsInt()
  @Min(MISSING_SENSE_HELPFUL_MIN)
  @Max(MISSING_SENSE_HELPFUL_DEFAULT)
  missingSenseModifier?: number;

  @ApiProperty({ description: 'Heatsense with a warm or cold target close by (spec 076): +20 by default, 0 to 20', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(HEATSENSE_MAX)
  heatsenseModifier?: number;

  @ApiProperty({
    description: 'grapple-escape (spec 077): one roll per grapple to escape from, in the same action',
    type: [GrappleEscapeRowDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => GrappleEscapeRowDto)
  grappleEscape?: GrappleEscapeRowDto[];

  @ApiProperty({
    description: 'Spec 079: the actor rolls a similar skill of the one the maneuver needs',
    type: SimilarityDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SimilarityDto)
  similarity?: SimilarityDto;

  @ApiProperty({
    description: 'Spec 079: helpers of complementary skills; the first adds its ranks, each next one half the one before',
    type: [ComplementaryHelperDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ComplementaryHelperDto)
  complementary?: ComplementaryHelperDto[];

  @ApiProperty({
    description: 'feat-of-strength (spec 079): the load; the API reads the difficulty on Table 5-2',
    type: FeatOfStrengthDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeatOfStrengthDto)
  featOfStrength?: FeatOfStrengthDto;

  @ApiProperty({
    description: 'Spec 079, D3: situational talents of the actor the game master ticks (err-maneuver-situational-trait)',
    type: [String],
    required: false,
    example: ['golden-throat'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  situationalTraits?: string[];

  @ApiProperty({
    description: 'Spec 079, D3: actor perceived or tracked by smell, whose Neutral or Distinct Odor counts (targetActorId when left out)',
    required: false,
  })
  @IsOptional()
  @IsString()
  senseTargetActorId?: string;

  @ApiProperty({ description: 'Roll; a grapple escape sends one in each grappleEscape row instead', type: ManeuverRollDto })
  @ValidateIf((dto: ResolveManeuverDto) => dto.purpose !== 'grapple-escape' || dto.roll !== undefined)
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
      ResolveManeuverDto.toSenses(dto),
      dto.grappleEscape?.map((row): GrappleEscapeRow => ({
        effectId: row.effectId,
        roll: row.roll,
        difficulty: row.difficulty,
        passiveTotal: row.passiveTotal,
      })),
      dto.similarity ? ResolveManeuverDto.toSimilarity(dto.similarity) : undefined,
      dto.complementary?.map((helper): ComplementaryChoice => ({
        ...(helper.actorId ? { actorId: helper.actorId } : {}),
        skillId: helper.skillId,
        ...(helper.specialization ? { specialization: helper.specialization } : {}),
      })),
      dto.featOfStrength ? { ...dto.featOfStrength } : undefined,
      dto.situationalTraits,
      dto.senseTargetActorId,
    );
  }

  static toSimilarity(dto: SimilarityDto): SimilarityChoice {
    return {
      targetSkillId: dto.targetSkillId,
      ...(dto.targetSpecialization ? { targetSpecialization: dto.targetSpecialization } : {}),
      similarity: dto.similarity,
      ...(dto.relation ? { relation: dto.relation } : {}),
    };
  }

  private static toSenses(dto: ResolveManeuverDto): SenseChoices | undefined {
    const senses: SenseChoices = {
      sense: dto.sense,
      senseUsage: dto.senseUsage,
      senseSelections: dto.senseSelections,
      missingSenseModifier: dto.missingSenseModifier,
      heatsenseModifier: dto.heatsenseModifier,
    };
    return Object.values(senses).some(value => value !== undefined) ? senses : undefined;
  }
}
