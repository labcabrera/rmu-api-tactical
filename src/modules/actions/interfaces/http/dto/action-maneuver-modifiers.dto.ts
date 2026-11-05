import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuverModifiers } from '../../../domain/value-objects/action-maneuver.vo.js';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import {
  MANEUVER_PURPOSES,
  type ManeuverPurpose,
  PRECISION_POSITIONS,
  type PrecisionPosition,
} from '../../../domain/value-objects/maneuver-purpose.vo.js';
import type { ComplementaryChoice, SimilarityChoice } from '../../../domain/services/skill-aids.js';
import type { FeatOfStrengthChoices } from '../../../domain/services/feat-of-strength.js';

export class ActionManeuverModifiersDto {
  @ApiProperty({ description: 'Skill identifier', example: 'climbing' })
  skillId: string;

  @ApiProperty({ type: String, description: 'Specialization of the skill', required: false, nullable: true })
  specialization?: string | null;

  @ApiProperty({ type: String, description: 'Maneuver type', enum: ['absolute', 'percent'] })
  maneuverType: ManeuverType;

  @ApiProperty({ type: String, description: 'Maneuver difficulty', example: 'm', required: false })
  difficulty?: Difficulty | undefined;

  customBonus?: number | undefined;

  @ApiProperty({ type: String, description: 'How the skill uses light', enum: ['none', 'helpful', 'required', 'hiding'], required: false })
  lightModifier?: string | undefined;

  light?: string | undefined;

  @ApiProperty({ type: Boolean, description: 'Deprecated: the armor penalty comes from the character sheet', required: false })
  armorModifier?: boolean | undefined;

  @ApiProperty({ description: 'Choices for the skill catalog modifiers', required: false })
  selections?: Record<string, ManeuverModifierSelection>;

  @ApiProperty({ description: 'Conflicting maneuver: total of the passive side', required: false })
  passiveTotal?: number;

  @ApiProperty({ description: 'Actor the maneuver is against (workspace spec 022)', required: false })
  targetActorId?: string;

  @ApiProperty({ description: 'Skill of the passive side read from the target actor', required: false })
  passiveSkillId?: string;

  @ApiProperty({
    type: String,
    description: 'What the maneuver is for: the frenzy (spec 040) or a combat talent (spec 076)',
    enum: MANEUVER_PURPOSES,
    required: false,
  })
  purpose?: ManeuverPurpose;

  @ApiProperty({ description: 'Combat talent maneuver (spec 076): the foe of Sense Weakness, Study Offense or Precision', required: false })
  foeActorId?: string;

  @ApiProperty({ description: 'Battle Cry (spec 076): level of the highest level foe', required: false })
  foeLevel?: number;

  @ApiProperty({ type: String, description: 'Precision (spec 076): position of the attacker', enum: PRECISION_POSITIONS, required: false })
  position?: PrecisionPosition;

  @ApiProperty({ description: 'Precision (spec 076): OB given up to make the maneuver easier', required: false })
  obPenalty?: number;

  @ApiProperty({
    description: 'Spec 079: the skill a similar skill stands for (targetSkillId, targetSpecialization, similarity, relation)',
    required: false,
    type: Object,
  })
  similarity?: SimilarityChoice;

  @ApiProperty({
    description: 'Spec 079: the helpers of complementary skills (actorId, skillId, specialization)',
    required: false,
    type: [Object],
  })
  complementary?: ComplementaryChoice[];

  @ApiProperty({
    description: 'Spec 079: the load of a feat of strength (loadWeight, mechanicalFactor, bodyWeight, strengthBonus)',
    required: false,
    type: Object,
  })
  featOfStrength?: FeatOfStrengthChoices;

  @ApiProperty({ description: 'Spec 079, D3: the situational talents ticked', required: false, type: [String] })
  situationalTraits?: string[];

  @ApiProperty({ description: 'Spec 079, D3: the actor perceived or tracked by smell', required: false })
  senseTargetActorId?: string;

  static fromEntity(entity: ActionManeuverModifiers): ActionManeuverModifiersDto {
    const dto = new ActionManeuverModifiersDto();
    dto.skillId = entity.skillId;
    dto.specialization = entity.specialization ?? null;
    dto.maneuverType = entity.maneuverType;
    dto.difficulty = entity.difficulty;
    dto.customBonus = entity.customBonus;
    dto.lightModifier = entity.lightModifier;
    dto.light = entity.light;
    dto.armorModifier = entity.armorModifier;
    dto.selections = entity.selections;
    dto.passiveTotal = entity.passiveTotal ?? undefined;
    dto.targetActorId = entity.targetActorId ?? undefined;
    dto.passiveSkillId = entity.passiveSkillId ?? undefined;
    dto.purpose = entity.purpose ?? undefined;
    dto.foeActorId = entity.foeActorId ?? undefined;
    dto.foeLevel = entity.foeLevel ?? undefined;
    dto.position = entity.position ?? undefined;
    dto.obPenalty = entity.obPenalty ?? undefined;
    dto.similarity = entity.similarity ?? undefined;
    dto.complementary = entity.complementary?.length ? entity.complementary : undefined;
    dto.featOfStrength = entity.featOfStrength ?? undefined;
    dto.situationalTraits = entity.situationalTraits?.length ? entity.situationalTraits : undefined;
    dto.senseTargetActorId = entity.senseTargetActorId ?? undefined;
    return dto;
  }
}
