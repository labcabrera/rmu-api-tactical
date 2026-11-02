import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CAST_SUPPORTS, type CastSupport, type TreatmentProcedure } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import { DIFFICULTY_MAP, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import { MEDICAL_ACTION_PROCEDURES } from '../../../domain/value-objects/action-medical.vo.js';
import { CreateActionCommand } from '../../../application/cqrs/commands/create-action.command.js';
import { FORCE_REASONS } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ForceReason } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';

export class ActionAttackCreationDto {
  @ApiProperty({ description: 'Attack type' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

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

  @ApiProperty({
    type: String,
    description: 'Maneuver type; the skill profile one when left out',
    enum: ['absolute', 'percent'],
    required: false,
  })
  @IsOptional()
  @IsIn(['absolute', 'percent'])
  maneuverType?: ManeuverType;

  @ApiProperty({ description: 'Specialization of the skill', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'Unfinished percent maneuver of the actor that this one continues', required: false })
  @IsOptional()
  @IsString()
  continuesActionId?: string;
}

export class ActionSpellCreationDto {
  @ApiProperty({ description: 'Code of the spell list in the caster spellbook', example: 'fire-law' })
  @IsString()
  @IsNotEmpty()
  listCode: string;

  @ApiProperty({ description: 'Spell identifier (rmu-api-spells)' })
  @IsString()
  @IsNotEmpty()
  spellId: string;
}

export class MedicalHerbalismCreationDto {
  @ApiProperty({ type: Number, nullable: true, description: 'Herbalism roll; null: the server rolls it' })
  @IsOptional()
  @IsInt()
  roll: number | null;

  @ApiProperty({ type: String, nullable: true, required: false, description: 'Herb of the healer: one unit is recorded as consumed' })
  @IsOptional()
  @IsString()
  itemId?: string | null;
}

/** Workspace spec 068, §2: the procedure of a `medical` action. */
export class ActionMedicalCreationDto {
  @ApiProperty({ description: 'Patient actor; it can be the healer itself' })
  @IsString()
  @IsNotEmpty()
  patientActorId: string;

  @ApiProperty({ type: String, nullable: true, required: false, description: 'Injury of the patient; null only to stabilize' })
  @IsOptional()
  @IsString()
  injuryId?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false, description: 'Dying effect of the patient, to stabilize' })
  @IsOptional()
  @IsString()
  effectId?: string | null;

  @ApiProperty({ type: String, enum: MEDICAL_ACTION_PROCEDURES, description: 'Surgery is not offered in combat' })
  @IsIn([...MEDICAL_ACTION_PROCEDURES, 'surgery'])
  procedure: TreatmentProcedure;

  @ApiProperty({ type: Number, nullable: true, required: false, description: "Rounds of the game master; core's duration when missing" })
  @IsOptional()
  @IsInt()
  @Min(1)
  rounds?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Medicine roll of the first round; null: the server rolls' })
  @IsOptional()
  @IsInt()
  roll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Unmodified roll (66 is an unusual event)' })
  @IsOptional()
  @IsInt()
  unmodifiedRoll?: number | null;

  @ApiProperty({ type: String, nullable: true, required: false, enum: [...DIFFICULTY_MAP.keys()], description: 'Difficulty override' })
  @IsOptional()
  @IsIn([...DIFFICULTY_MAP.keys()])
  difficulty?: Difficulty | null;

  @ApiProperty({ type: MedicalHerbalismCreationDto, nullable: true, required: false, description: 'A herb that helps: +25 on success' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHerbalismCreationDto)
  herbalism?: MedicalHerbalismCreationDto | null;

  @ApiProperty({ type: String, required: false, enum: CAST_SUPPORTS, description: 'Cast on a leg: what the patient walks with' })
  @IsOptional()
  @IsIn(CAST_SUPPORTS)
  castSupport?: CastSupport;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Recovery modifier of a salve (core range)' })
  @IsOptional()
  @IsInt()
  salveModifier?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Cauterize: total of the heat hits dice' })
  @IsOptional()
  @IsInt()
  heatHitsRoll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Cauterize: roll of the heat critical (1-100)' })
  @IsOptional()
  @IsInt()
  heatCriticalRoll?: number | null;
}

/** Workspace spec 068, §2: the healing item of a `use_item` action. */
export class ActionUseItemCreationDto {
  @ApiProperty({ description: 'Strategic item of the actor' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Actor the item is used on; the actor itself when missing', required: false })
  @IsOptional()
  @IsString()
  targetActorId: string;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Hits healed; rolled in the range of the item when missing' })
  @IsOptional()
  @IsInt()
  roll?: number | null;
}

export class ForceActionDto {
  @ApiProperty({ type: String, description: 'Why the action is resolved out of turn', enum: FORCE_REASONS })
  @IsIn(FORCE_REASONS)
  reason: ForceReason;

  @ApiProperty({ description: 'Note of the game master', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateActionDto {
  @ApiProperty({ description: 'Game identifier' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Character identifier' })
  @IsString()
  @IsNotEmpty()
  actorId: string;

  @ApiProperty({ type: String, description: 'Action type' })
  @IsString()
  @IsNotEmpty()
  actionType: ActionType;

  @ApiProperty({ description: 'Instantaneous action (not allowed on attacks)', default: false, example: false })
  @IsOptional()
  @IsBoolean()
  freeAction: boolean = false;

  @ApiProperty({ description: 'Phase start' })
  @IsNumber()
  phaseStart: number;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverCreationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionManeuverCreationDto)
  @IsObject()
  maneuver: ActionManeuverCreationDto | undefined;

  @ApiProperty({
    description: 'A new action resolved out of turn (an effect or the game master): it takes no AP and skips the phase checks',
    type: ForceActionDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ForceActionDto)
  @IsObject()
  forced?: ForceActionDto;

  @ApiProperty({ description: 'Spell of a cast_spell action (spec 030)', type: ActionSpellCreationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionSpellCreationDto)
  @IsObject()
  spell?: ActionSpellCreationDto;

  @ApiProperty({ description: 'Procedure of a medical action (spec 068)', type: ActionMedicalCreationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionMedicalCreationDto)
  @IsObject()
  medical?: ActionMedicalCreationDto;

  @ApiProperty({ description: 'Item of a use_item action (spec 068)', type: ActionUseItemCreationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionUseItemCreationDto)
  @IsObject()
  useItem?: ActionUseItemCreationDto;

  @ApiProperty({
    description: 'Declare despite the warnings that need a confirmation (409 err-action-confirm-required lists them)',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    return new CreateActionCommand(
      dto.gameId,
      dto.actorId,
      dto.actionType,
      dto.freeAction,
      dto.phaseStart,
      dto.maneuver,
      '',
      userId,
      roles,
      dto.forced ? { reason: dto.forced.reason, note: dto.forced.note } : undefined,
      dto.spell ? { listCode: dto.spell.listCode, spellId: dto.spell.spellId } : undefined,
      dto.medical ? { ...dto.medical } : undefined,
      dto.useItem ? { itemId: dto.useItem.itemId, targetActorId: dto.useItem.targetActorId, roll: dto.useItem.roll } : undefined,
      dto.confirm === true,
    );
  }
}
