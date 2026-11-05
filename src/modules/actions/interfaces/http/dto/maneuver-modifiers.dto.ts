import { ApiProperty } from '@nestjs/swagger';
import type {
  FeatOfStrengthListing,
  ManeuverFogListing,
  ManeuverModifiersListing,
} from '../../../application/services/maneuver/maneuver-context.service.js';
import type { ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { ManeuverModifierDefinition } from '../../../domain/value-objects/maneuver-profile.vo.js';
import { SkippedRuleDto } from './skipped-rule.dto.js';
import { SENSE_SELECTIONS, SENSE_USAGES, SENSES } from '../../../../shared/domain/senses/sense-modifiers.js';

export class ManeuverOptionDto {
  @ApiProperty({ example: 'h' })
  key: string;

  @ApiProperty({ example: -10 })
  value: number;
}

export class ManeuverSkillDto {
  @ApiProperty({ example: 'climbing' })
  skillId: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  specialization: string | null;

  @ApiProperty({ description: 'Skill bonus of the sheet (-25 when unskilled)', example: 45 })
  bonus: number;

  @ApiProperty({ example: 6 })
  ranks: number;

  @ApiProperty({ description: 'The character does not have the skill' })
  unskilled: boolean;
}

export class ManeuverBaseModifierDto {
  @ApiProperty({ example: 'armor-maneuver' })
  key: string;

  @ApiProperty({ example: -30 })
  value: number;

  @ApiProperty({ enum: ['actor-round', 'equipment', 'movement', 'action'] })
  source: string;

  @ApiProperty({ required: false, description: 'Breakdown group', example: 'penalty' })
  group?: string;

  @ApiProperty({ required: false, description: 'Rule reference', example: '§7.2' })
  rule?: string;

  @ApiProperty({ required: false, description: 'Inputs of the value, for its explanation', type: Object })
  params?: ModifierParams;
}

export class ManeuverDifficultyDto {
  @ApiProperty({ example: 'm' })
  default: string;

  @ApiProperty({ type: [ManeuverOptionDto] })
  options: ManeuverOptionDto[];
}

export class ManeuverLightOptionDto extends ManeuverOptionDto {
  @ApiProperty({ required: false, description: 'Light Sensitivity penalty of the actor in this light (spec 076)', example: -25 })
  sensitivity?: number;
}

export class ManeuverLightDto {
  @ApiProperty({ enum: ['helpful', 'required', 'hiding'] })
  usage: string;

  @ApiProperty({
    type: [ManeuverLightOptionDto],
    description: 'Light types with their value for this usage, with the Nightvision column when the actor has it (spec 076)',
  })
  options: ManeuverLightOptionDto[];
}

export class ManeuverSenseModifierDto {
  @ApiProperty({ description: 'Trait id', example: 'acute-hearing' })
  key: string;

  @ApiProperty({ description: 'Value (the default one when the game master may change it)', example: 10 })
  value: number;

  @ApiProperty({ example: '§4.6' })
  rule: string;

  @ApiProperty({ type: Object })
  params: Record<string, number | string>;

  @ApiProperty({ required: false, enum: SENSES, description: 'Sense it applies to; any when missing' })
  sense?: string;

  @ApiProperty({ required: false, enum: SENSE_USAGES, description: 'Usage it applies to; any when missing' })
  usage?: string;

  @ApiProperty({ required: false, enum: SENSE_SELECTIONS, description: 'Selection it needs' })
  selection?: string;

  @ApiProperty({ required: false, description: 'Lowest value that can be sent (missingSenseModifier, heatsenseModifier)' })
  min?: number;

  @ApiProperty({ required: false, description: 'Highest value that can be sent' })
  max?: number;
}

export class ManeuverSensesDto {
  @ApiProperty({ enum: SENSES, example: 'vision' })
  default: string;

  @ApiProperty({ enum: SENSES, isArray: true, description: 'Senses the actor can use (extra with Extra Sense)' })
  options: string[];

  @ApiProperty({ enum: SENSE_USAGES, example: 'required' })
  defaultUsage: string;

  @ApiProperty({ enum: SENSE_USAGES, isArray: true })
  usages: string[];

  @ApiProperty({ enum: SENSE_SELECTIONS, isArray: true, description: 'Selections that change something for the actor' })
  selections: string[];

  @ApiProperty({ type: [ManeuverSenseModifierDto], description: 'Modifiers of the sense talents of the actor, with their conditions' })
  modifiers: ManeuverSenseModifierDto[];
}

export class ManeuverModifierDefinitionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'animal-domestication' })
  key: string;

  @ApiProperty()
  scope: { skillIds?: string[]; categoryIds?: string[] };

  @ApiProperty({ enum: ['flag', 'choice', 'number'] })
  type: string;

  @ApiProperty({ required: false })
  value?: number;

  @ApiProperty({ type: [ManeuverOptionDto], required: false })
  options?: ManeuverOptionDto[];

  @ApiProperty({ required: false })
  perUnit?: number;

  @ApiProperty({ required: false })
  min?: number;

  @ApiProperty({ required: false })
  max?: number;

  @ApiProperty({ required: false })
  description?: string;

  static fromEntity(entity: ManeuverModifierDefinition): ManeuverModifierDefinitionDto {
    const dto = new ManeuverModifierDefinitionDto();
    dto.id = entity.id;
    dto.key = entity.key;
    dto.scope = entity.scope;
    dto.type = entity.type;
    dto.value = entity.value;
    dto.options = entity.options;
    dto.perUnit = entity.perUnit;
    dto.min = entity.min;
    dto.max = entity.max;
    dto.description = entity.description;
    return dto;
  }
}

export class ManeuverModifiersDto {
  @ApiProperty({ type: ManeuverSkillDto })
  skill: ManeuverSkillDto;

  @ApiProperty({ enum: ['absolute', 'percent'] })
  maneuverType: string;

  @ApiProperty({ example: 'gymnastic' })
  resultTable: string;

  @ApiProperty({ type: [ManeuverBaseModifierDto], description: 'Applied on their own, read only' })
  base: ManeuverBaseModifierDto[];

  @ApiProperty({ type: ManeuverDifficultyDto })
  difficulty: ManeuverDifficultyDto;

  @ApiProperty({ type: ManeuverLightDto, required: false, description: 'Only when the skill uses light' })
  light?: ManeuverLightDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ambient light of the tactical game (spec 076): the default of the light selector',
    example: 'dark',
  })
  defaultLight: string | null;

  @ApiProperty({ type: ManeuverSensesDto, required: false, description: 'Perception and Tracking only (spec 076)' })
  senses?: ManeuverSensesDto;

  @ApiProperty({
    type: Object,
    required: false,
    description:
      'Spec 079, C5 (Table 15-7): the fog of the game for Perception and Tracking: level, visibilityFeet, vision (modifier ' +
      'of a visual maneuver, not reduced by vision talents) and hearingBeyondRange (with the selection beyond-visual-range)',
  })
  fog?: ManeuverFogListing;

  @ApiProperty({ type: [ManeuverModifierDefinitionDto] })
  skillModifiers: ManeuverModifierDefinitionDto[];

  @ApiProperty({ description: 'The maneuver can be in conflict: the passive total may be given' })
  conflicting: boolean;

  @ApiProperty({ required: false, description: 'Percent maneuvers: progress accumulated' })
  progress?: number;

  @ApiProperty({ type: [SkippedRuleDto], description: 'Rules of the base modifiers that do not apply, and why' })
  skipped: SkippedRuleDto[];

  @ApiProperty({
    type: [ManeuverBaseModifierDto],
    required: false,
    description: 'Spec 079: the lines of the similar skill and the complementary skills asked for',
  })
  aids?: ManeuverBaseModifierDto[];

  @ApiProperty({
    type: Object,
    required: false,
    description:
      'Spec 079, feat-of-strength: bodyWeight and strengthBonus of the sheet (null when it has none), the Adrenal Strength ' +
      'weightMultiplier, and the result (difficulty of Table 5-2) or the invalid reason of the load asked for',
  })
  featOfStrength?: FeatOfStrengthListing;

  static fromListing(listing: ManeuverModifiersListing): ManeuverModifiersDto {
    const dto = new ManeuverModifiersDto();
    dto.skill = { ...listing.skill };
    dto.maneuverType = listing.maneuverType;
    dto.resultTable = listing.resultTable;
    dto.base = listing.base.map(modifier => ({ ...modifier }));
    dto.difficulty = { default: listing.difficulty.default, options: listing.difficulty.options };
    if (listing.light) {
      dto.light = { usage: listing.light.usage, options: listing.light.options.map(option => ({ ...option })) };
    }
    dto.defaultLight = listing.defaultLight ?? null;
    if (listing.senses) {
      dto.senses = {
        ...listing.senses,
        modifiers: listing.senses.modifiers.map(modifier => ({ ...modifier, params: { ...modifier.params } })),
      };
    }
    if (listing.fog) dto.fog = { ...listing.fog };
    dto.skillModifiers = listing.skillModifiers.map(modifier => ManeuverModifierDefinitionDto.fromEntity(modifier));
    dto.conflicting = listing.conflicting;
    dto.progress = listing.progress;
    dto.skipped = listing.skipped.map(rule => SkippedRuleDto.fromEntity(rule));
    if (listing.aids) dto.aids = listing.aids.map(modifier => ({ ...modifier }) as ManeuverBaseModifierDto);
    if (listing.featOfStrength) dto.featOfStrength = { ...listing.featOfStrength };
    return dto;
  }
}
