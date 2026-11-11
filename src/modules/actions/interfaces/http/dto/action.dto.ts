import { OTHER_ACTION_KINDS, type OtherActionKind } from '../../../domain/value-objects/action-ap-profile.vo.js';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { Action } from '../../../domain/aggregates/action.js';
import type { ActionReadiness } from '../../../domain/aggregates/action.js';
import { ActionResolution } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ForceReason, ForcedApSource, ResolutionMode } from '../../../domain/value-objects/action-resolution.vo.js';
import { ACTION_STATUSES } from '../../../domain/value-objects/action-status.vo.js';
import type { ActionStatus } from '../../../domain/value-objects/action-status.vo.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import { ActionAttackDto } from './action-attack.dto.js';
import { ActionMedicalDto, ActionUseItemDto, ActionWarningDto } from './action-medical.dto.js';
import { ActionManeuverDto } from './action-maneuver.dto.js';
import { ActionSpellDto } from './action-spell.dto.js';
import { ActionMovementDto } from './action-movement.dto.js';
import { ActionParryDto, ParryExclusionDto } from './action-parry.dto.js';

export class ActionApProfileDto {
  @ApiProperty({ description: 'Minimum action points to resolve the action', example: 2 })
  min: number;

  @ApiProperty({ description: 'Action points to resolve the action without penalty', example: 4 })
  max: number;
}

export class ActionResolutionDto {
  @ApiProperty({ type: String, description: 'Normal resolution, or forced out of turn', enum: ['normal', 'forced'], example: 'normal' })
  mode: ResolutionMode;

  @ApiProperty({
    type: String,
    description: 'Why the action is forced',
    enum: ['withdrawal', 'pass-through', 'effect', 'gm'],
    required: false,
  })
  reason?: ForceReason;

  @ApiProperty({
    type: String,
    description: 'Where the AP of a forced action come from',
    enum: ['next-phase', 'none', 'as-spent'],
    required: false,
  })
  apSource?: ForcedApSource;

  @ApiProperty({ description: 'Note of the game master', required: false })
  note?: string;

  static fromEntity(resolution: ActionResolution): ActionResolutionDto {
    const dto = new ActionResolutionDto();
    dto.mode = resolution.mode;
    if (resolution.reason) dto.reason = resolution.reason;
    if (resolution.apSource) dto.apSource = resolution.apSource;
    if (resolution.note) dto.note = resolution.note;
    return dto;
  }
}

/** Workspace spec 079, A6: the stray shot an attack forced as `stray-shot` comes from (§9.7). */
export class ActionStrayShotDto {
  @ApiProperty({ description: 'stray-shot alert of the attacker it was declared from' })
  alertId: string;

  @ApiProperty({ description: 'Ranged attack that missed' })
  triggerActionId: string;

  @ApiProperty({ description: 'Attack of the actor that missed, used again', example: 'mainHand' })
  attackName: string;

  @ApiProperty({ description: 'Combatant chosen at random among those that gave cover' })
  targetActorId: string;
}

/** Workspace spec 076: the reaction of an attack forced as `reaction`. */
export class ActionReactionDto {
  @ApiProperty({ example: 'riposte' })
  traitId: string;

  @ApiProperty({ description: 'Action that triggered the reaction' })
  triggerActionId: string;

  @ApiProperty({ type: Number, nullable: true, description: 'Fixed OB of the attack (Riposte); null: the OB declared', example: 15 })
  obOverride: number | null;

  @ApiProperty({ type: String, nullable: true, description: 'Alert it was declared from; null when forced by the game master' })
  alertId: string | null;
}

/** Workspace spec 076: the weapon of a `draw_and_load` action. */
export class ActionDrawAndLoadDto {
  @ApiProperty({ type: String, nullable: true, description: 'Item of the actor drawn or loaded' })
  itemId: string | null;
}

/** Workspace spec 076: the foe and the ranged weapon of an `aim` action (Sharpshooter). */
export class ActionAimDto {
  @ApiProperty({ description: 'Foe aimed at' })
  targetActorId: string;

  @ApiProperty({ description: 'Ranged weapon (item of the actor) aimed with' })
  itemId: string;
}

/** Workspace spec 079, decision A5: the fixed-cost subtype of an `other` action (Table 8-1). */
export class ActionOtherDto {
  @ApiProperty({ enum: OTHER_ACTION_KINDS, example: 'load-crossbow' })
  kind: OtherActionKind;

  @ApiProperty({ type: String, nullable: true, description: 'Attack of the weapon strung or loaded' })
  attackName: string | null;

  @ApiProperty({ description: 'AP the action takes (Table 8-1)', example: 6 })
  ap: number;
}

export class ActionDto {
  @ApiProperty({ description: 'Action identifier', example: 'action-123' })
  id: string;

  @ApiProperty({ type: Number, description: 'Version of optimistic concurrency: it goes up with each write', example: 0 })
  version: number;

  @ApiProperty({ description: 'Game identifier', example: 'game-456' })
  gameId: string;

  @ApiProperty({
    type: String,
    description: 'Action status. An attack action is `pending_roll` while any of its attacks waits for a roll',
    enum: ACTION_STATUSES,
    example: 'declared',
  })
  status: ActionStatus;

  @ApiProperty({ description: 'Character identifier', example: 'character-789' })
  actorId: string;

  @ApiProperty({ description: 'The round number in which the action takes place', example: 1 })
  round: number;

  @ApiProperty({ type: String, description: 'Action type', example: 'attack' })
  actionType: ActionType;

  @ApiProperty({ description: 'Is free action', example: false })
  freeAction: boolean;

  @ApiProperty({ description: 'Phase start', example: 1 })
  phaseStart: number;

  @ApiProperty({ type: Number, description: 'Phase end', example: 1 })
  phaseEnd: number | null;

  @ApiProperty({ type: Number, description: 'Action points spent on the action, from the AP ledger of its actor round', example: 2 })
  actionPoints: number | null;

  @ApiProperty({ description: 'AP range of the action', type: ActionApProfileDto })
  apProfile: ActionApProfileDto;

  @ApiProperty({
    type: String,
    description: 'How close the action is to being resolved; null when it could not be computed',
    enum: ['blocked', 'unreachable', 'ready', 'optimal', 'held', 'in-resolution', 'done'],
    nullable: true,
  })
  readiness: ActionReadiness | null;

  @ApiProperty({
    type: Number,
    description: 'Penalty of resolving the action with its AP now (0 or negative)',
    nullable: true,
    example: -50,
  })
  readinessPenalty: number | null;

  @ApiProperty({ description: 'How the action is resolved', type: ActionResolutionDto })
  resolution: ActionResolutionDto;

  @ApiProperty({
    type: String,
    description: 'Action of the previous round this one continues (open rounds, multi-round or held actions)',
    nullable: true,
    example: 'action-122',
  })
  continuesActionId: string | null;

  @ApiProperty({
    type: Number,
    description: 'AP carried from the continued action; already counted in `actionPoints`',
    nullable: true,
    example: 1,
  })
  carriedAp: number | null;

  @ApiProperty({ description: 'Declared by the game master in a past phase of the round (workspace spec 089)', example: false })
  retroactive: boolean;

  @ApiProperty({ description: 'Action movement', type: ActionMovementDto, required: false })
  movement: ActionMovementDto | null;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverDto, required: false })
  maneuver: ActionManeuverDto | null;

  @ApiProperty({ description: 'Spell of a cast_spell action (spec 030)', type: ActionSpellDto, required: false })
  spell: ActionSpellDto | null;

  @ApiProperty({ description: 'Action attacks', type: [ActionAttackDto], required: false })
  attacks: ActionAttackDto[] | null;

  @ApiProperty({ description: 'Declared parries', type: [ActionParryDto], required: false })
  parries: ActionParryDto[] | null;

  @ApiProperty({ description: 'Actors who cannot parry or protect, and why', type: [ParryExclusionDto], required: false })
  parryExclusions: ParryExclusionDto[];

  @ApiProperty({ description: 'Procedure of a medical action (spec 068)', type: ActionMedicalDto, required: false, nullable: true })
  medical: ActionMedicalDto | null;

  @ApiProperty({ description: 'Item of a use_item action (spec 068)', type: ActionUseItemDto, required: false, nullable: true })
  useItem: ActionUseItemDto | null;

  @ApiProperty({ description: 'Reaction of an attack forced as reaction (spec 076)', type: ActionReactionDto, nullable: true })
  reaction: ActionReactionDto | null;

  @ApiProperty({ description: 'Weapon of a draw_and_load action (spec 076)', type: ActionDrawAndLoadDto, nullable: true })
  drawAndLoad: ActionDrawAndLoadDto | null;

  @ApiProperty({ description: 'Foe and weapon of an aim action (spec 076)', type: ActionAimDto, nullable: true })
  aim: ActionAimDto | null;

  @ApiProperty({ description: 'Fixed-cost subtype of an other action (spec 079)', type: ActionOtherDto, nullable: true })
  otherAction: ActionOtherDto | null;

  @ApiProperty({ description: 'Stray shot of an attack forced as stray-shot (spec 079)', type: ActionStrayShotDto, nullable: true })
  strayShot: ActionStrayShotDto | null;

  @ApiProperty({ description: 'Warnings of the request that did not need a confirmation (spec 068)', type: [ActionWarningDto] })
  warnings: ActionWarningDto[];

  @ApiProperty({ type: Number, description: 'Fatigue generated by the action', example: 5, required: false })
  fatigue: number | null;

  @ApiProperty({ type: String, description: 'Action description' })
  description: string | null;

  static fromEntity(entity: Action) {
    const dto = new ActionDto();
    dto.id = entity.id;
    dto.version = entity.version;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
    dto.status = entity.status;
    dto.round = entity.round;
    dto.actionType = entity.actionType;
    dto.freeAction = entity.freeAction;
    dto.phaseStart = entity.phaseStart;
    dto.phaseEnd = entity.phaseEnd;
    const state = entity.apState;
    const profile = entity.apProfile();
    dto.actionPoints = state ? state.actionPoints : entity.actionPoints;
    dto.apProfile = { min: profile.min, max: profile.max };
    dto.readiness = state ? state.readiness : (entity.readinessByStatus() ?? null);
    dto.readinessPenalty = state ? state.readinessPenalty : null;
    dto.resolution = ActionResolutionDto.fromEntity(entity.effectiveResolution());
    dto.continuesActionId = entity.continuesActionId ?? null;
    dto.carriedAp = entity.carriedAp ?? null;
    dto.retroactive = entity.retroactive ?? false;
    dto.movement = entity.movement ? ActionMovementDto.fromEntity(entity.movement) : null;
    dto.maneuver = entity.maneuver ? ActionManeuverDto.fromEntity(entity.maneuver) : null;
    dto.spell = entity.spell ? ActionSpellDto.fromEntity(entity.spell) : null;
    dto.attacks = entity.attacks && entity.attacks.length > 0 ? entity.attacks.map(a => ActionAttackDto.fromEntity(a)) : null;
    dto.parries = entity.parries ? entity.parries.map(p => ActionParryDto.fromEntity(p)) : null;
    dto.parryExclusions = (entity.parryExclusions ?? []).map(p => ParryExclusionDto.fromEntity(p));
    dto.medical = entity.medical ? ActionMedicalDto.fromEntity(entity.medical) : null;
    dto.useItem = entity.useItem ? ActionUseItemDto.fromEntity(entity.useItem) : null;
    dto.reaction = entity.reaction ? { ...entity.reaction } : null;
    dto.drawAndLoad = entity.drawAndLoad ? { ...entity.drawAndLoad } : null;
    dto.otherAction = entity.otherAction ? { ...entity.otherAction } : null;
    dto.strayShot = entity.strayShot ? { ...entity.strayShot } : null;
    dto.aim = entity.aim ? { ...entity.aim } : null;
    dto.warnings = (entity.warnings ?? []).map(warning => ActionWarningDto.fromEntity(warning));
    dto.fatigue = entity.fatigue;
    dto.description = entity.description;
    return dto;
  }
}

export class ActionPageDto {
  @ApiProperty({ type: [ActionDto], description: 'Actions' })
  content: ActionDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
