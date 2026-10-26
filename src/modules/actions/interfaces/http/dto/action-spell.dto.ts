import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import type { SpellPreview } from '../../../application/cqrs/handlers/spell.handlers.js';
import {
  type ActionSpell,
  type ActionSpellOptions,
  SPELL_ARMORS,
  SPELL_HANDS,
  SPELL_HELMETS,
  SPELL_REALMS,
  SPELL_VOICES,
  type SpellArmor,
  type SpellHands,
  type SpellHelmet,
  type SpellRealm,
  type SpellTargetConditions,
  type SpellVoice,
} from '../../../domain/value-objects/action-spell.vo.js';
import { KeyValueModifierDto } from './key-value-modifier.dto.js';

export class SpellOptionsDto implements Partial<ActionSpellOptions> {
  @ApiProperty({ description: 'Cast subtly (Table 4-2 subtlety for the spell type)', required: false })
  @IsOptional()
  @IsBoolean()
  subtle?: boolean;

  @ApiProperty({ type: String, enum: SPELL_HANDS, required: false, example: 'two' })
  @IsOptional()
  @IsIn(SPELL_HANDS)
  hands?: SpellHands;

  @ApiProperty({ type: String, enum: SPELL_VOICES, required: false, example: 'normal' })
  @IsOptional()
  @IsIn(SPELL_VOICES)
  voice?: SpellVoice;

  @ApiProperty({ type: String, enum: SPELL_HELMETS, required: false, example: 'none' })
  @IsOptional()
  @IsIn(SPELL_HELMETS)
  helmet?: SpellHelmet;

  @ApiProperty({ type: String, enum: SPELL_ARMORS, required: false, example: 'none' })
  @IsOptional()
  @IsIn(SPELL_ARMORS)
  armor?: SpellArmor;

  @ApiProperty({ description: 'Encumbrance percent of the armor', required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  armorEncumbrance?: number;

  @ApiProperty({ description: 'Rounds of preparation (+10 each, up to +20)', required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  preparationRounds?: number;

  @ApiProperty({ description: 'Modifier of the game master', required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  customBonus?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customBonusNote?: string;
}

export class RollSpellDto {
  @ApiProperty({ type: SpellOptionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpellOptionsDto)
  @IsObject()
  options?: SpellOptionsDto;

  @ApiProperty({ description: 'Open-ended roll', example: 72 })
  @IsNumber()
  roll: number;
}

export class PreviewSpellDto {
  @ApiProperty({ type: SpellOptionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpellOptionsDto)
  @IsObject()
  options?: SpellOptionsDto;
}

export class RollSpellFailureDto {
  @ApiProperty({ description: 'Open-ended roll', example: 42 })
  @IsNumber()
  roll: number;

  @ApiProperty({ type: String, enum: SPELL_REALMS, required: false, description: 'Table of a hybrid list' })
  @IsOptional()
  @IsIn(SPELL_REALMS)
  realm?: SpellRealm;
}

export class SpellTargetConditionsDto implements SpellTargetConditions {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  willing?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  surprisedOrStunned?: boolean;

  @ApiProperty({ type: String, enum: ['none', 'partial', 'full'], required: false })
  @IsOptional()
  @IsIn(['none', 'partial', 'full'])
  cover?: 'none' | 'partial' | 'full';

  @ApiProperty({ type: String, enum: ['none', 'organic', 'metal'], required: false })
  @IsOptional()
  @IsIn(['none', 'organic', 'metal'])
  armor?: 'none' | 'organic' | 'metal';

  @ApiProperty({ type: String, enum: ['none', 'organic', 'metal'], required: false })
  @IsOptional()
  @IsIn(['none', 'organic', 'metal'])
  helmet?: 'none' | 'organic' | 'metal';

  @ApiProperty({ type: String, enum: ['touch', 'close', 'normal', 'far'], required: false })
  @IsOptional()
  @IsIn(['touch', 'close', 'normal', 'far'])
  range?: 'touch' | 'close' | 'normal' | 'far';
}

export class SpellTargetRollDto {
  @ApiProperty()
  @IsString()
  actorId: string;

  @ApiProperty({ description: 'Open-ended roll; not needed by a willing target of a Utility spell', required: false })
  @IsOptional()
  @IsNumber()
  roll?: number;

  @ApiProperty({ type: SpellTargetConditionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpellTargetConditionsDto)
  @IsObject()
  conditions?: SpellTargetConditionsDto;

  @ApiProperty({ description: 'RR bonus of a target without a sheet (NPC)', required: false })
  @IsOptional()
  @IsNumber()
  bonus?: number;
}

export class ResolveSpellResistanceDto {
  @ApiProperty({ type: [SpellTargetRollDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpellTargetRollDto)
  targets: SpellTargetRollDto[];
}

export class ApplySpellDto {
  @ApiProperty({ description: 'Power points to spend; the spell or the failure result gives them by default', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  powerPoints?: number;
}

export class SpellPreviewDto {
  @ApiProperty({ type: [KeyValueModifierDto] })
  modifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Sum of the modifiers: the SCR is the roll plus this', example: 18 })
  bonus: number;

  @ApiProperty({ description: 'An overcast spell: the choices need a preparation round' })
  needsPreparation: boolean;

  @ApiProperty({ example: 4 })
  actionPoints: number;

  static fromPreview(preview: SpellPreview): SpellPreviewDto {
    const dto = new SpellPreviewDto();
    dto.modifiers = preview.modifiers.map(modifier => KeyValueModifierDto.fromEntity(modifier));
    dto.bonus = preview.bonus;
    dto.needsPreparation = preview.needsPreparation;
    dto.actionPoints = preview.actionPoints;
    return dto;
  }
}

/** The spell of a `cast_spell` action, as the domain keeps it (spec 030). */
export class ActionSpellDto {
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'The spell cast, from the caster spellbook' })
  spell: ActionSpell['spell'];

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Realms, realm stat bonus, level and list ranks' })
  caster: ActionSpell['caster'];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  options?: ActionSpell['options'];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'SCR: roll, modifiers and total' })
  roll?: ActionSpell['roll'];

  @ApiProperty({ type: String, enum: ['success', 'no-effect', 'failure'], required: false })
  result?: ActionSpell['result'];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  failure?: ActionSpell['failure'];

  @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
  targets?: ActionSpell['targets'];

  @ApiProperty({ type: Number, nullable: true, required: false })
  powerPointsSpent?: number | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Attack of an attack spell (bolt or ball), resolved with the attack endpoints after a successful SCR',
  })
  attack?: ActionSpell['attack'];

  static fromEntity(entity: ActionSpell): ActionSpellDto {
    return Object.assign(new ActionSpellDto(), structuredClone(entity));
  }
}
