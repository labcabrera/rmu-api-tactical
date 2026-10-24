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
import { ActionManeuverDto } from './action-maneuver.dto.js';
import { ActionMovementDto } from './action-movement.dto.js';
import { ActionParryDto } from './action-parry.dto.js';

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

  @ApiProperty({ description: 'Action movement', type: ActionMovementDto, required: false })
  movement: ActionMovementDto | null;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverDto, required: false })
  maneuver: ActionManeuverDto | null;

  @ApiProperty({ description: 'Action attacks', type: [ActionAttackDto], required: false })
  attacks: ActionAttackDto[] | null;

  @ApiProperty({ description: 'Declared parries', type: [ActionParryDto], required: false })
  parries: ActionParryDto[] | null;

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
    dto.movement = entity.movement ? ActionMovementDto.fromEntity(entity.movement) : null;
    dto.maneuver = entity.maneuver ? ActionManeuverDto.fromEntity(entity.maneuver) : null;
    dto.attacks = entity.attacks && entity.attacks.length > 0 ? entity.attacks.map(a => ActionAttackDto.fromEntity(a)) : null;
    dto.parries = entity.parries ? entity.parries.map(p => ActionParryDto.fromEntity(p)) : null;
    dto.fatigue = entity.fatigue;
    dto.description = entity.description;
    return dto;
  }
}

export class ActionPageDto {
  @ApiProperty({ type: [ActionDto], description: 'Actions', isArray: true })
  content: ActionDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
