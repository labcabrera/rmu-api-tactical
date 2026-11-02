import { ApiProperty } from '@nestjs/swagger';
import type { ManeuverModifiersListing } from '../../../application/services/maneuver/maneuver-context.service.js';
import type { ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { ManeuverModifierDefinition } from '../../../domain/value-objects/maneuver-profile.vo.js';
import { SkippedRuleDto } from './skipped-rule.dto.js';

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

export class ManeuverLightDto {
  @ApiProperty({ enum: ['helpful', 'required', 'hiding'] })
  usage: string;

  @ApiProperty({ type: [ManeuverOptionDto], description: 'Light types with their value for this usage' })
  options: ManeuverOptionDto[];
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

  @ApiProperty({ type: [ManeuverModifierDefinitionDto] })
  skillModifiers: ManeuverModifierDefinitionDto[];

  @ApiProperty({ description: 'The maneuver can be in conflict: the passive total may be given' })
  conflicting: boolean;

  @ApiProperty({ required: false, description: 'Percent maneuvers: progress accumulated' })
  progress?: number;

  @ApiProperty({ type: [SkippedRuleDto], description: 'Rules of the base modifiers that do not apply, and why' })
  skipped: SkippedRuleDto[];

  static fromListing(listing: ManeuverModifiersListing): ManeuverModifiersDto {
    const dto = new ManeuverModifiersDto();
    dto.skill = { ...listing.skill };
    dto.maneuverType = listing.maneuverType;
    dto.resultTable = listing.resultTable;
    dto.base = listing.base.map(modifier => ({ ...modifier }));
    dto.difficulty = { default: listing.difficulty.default, options: listing.difficulty.options };
    if (listing.light) {
      dto.light = { usage: listing.light.usage, options: listing.light.options };
    }
    dto.skillModifiers = listing.skillModifiers.map(modifier => ManeuverModifierDefinitionDto.fromEntity(modifier));
    dto.conflicting = listing.conflicting;
    dto.progress = listing.progress;
    dto.skipped = listing.skipped.map(rule => SkippedRuleDto.fromEntity(rule));
    return dto;
  }
}
