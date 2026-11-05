import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack, type ActionAttackReaction } from '../../../domain/value-objects/action-attack.vo.js';
import type { AttackStatus } from '../../../domain/value-objects/attack-status.vo.js';
import type { ShieldManeuver } from '../../../domain/value-objects/shield-maneuver.vo.js';
import { KeyValueModifierDto } from './key-value-modifier.dto.js';
import { ActionAttackCalculatedDto } from './action-attack-calculated.dto.js';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto.js';
import { ActionAttackResultsDto } from './action-attack-results.dto.js';
import { ActionAttackRollDto } from './action-attack-roll.dto.js';

/** Workspace spec 076: the reaction talent the attack comes from. */
export class ActionAttackReactionDto {
  @ApiProperty({ example: 'riposte' })
  traitId: string;

  @ApiProperty({ description: 'Action that triggered the reaction' })
  triggerActionId: string;

  @ApiProperty({ type: Number, nullable: true, description: 'Fixed OB of the attack; null: the OB declared', example: 15 })
  obOverride: number | null;
}

/** Workspace spec 077, decisions A1.2-A1.5: the Shield maneuver the defender rolls against the attack. */
export class ShieldManeuverDto {
  @ApiProperty({ description: 'Defender whose shield covers the attack' })
  targetId: string;

  @ApiProperty({ description: 'The attack needs the maneuver (from the second attack the shield covers)', example: true })
  required: boolean;

  @ApiProperty({ description: 'Shield skill bonus of the defender', example: 45 })
  skill: number;

  @ApiProperty({ type: [KeyValueModifierDto], description: 'Shield DB and blocking the attack takes when it passes' })
  modifiers: KeyValueModifierDto[];

  @ApiProperty({ type: Number, required: false, nullable: true, example: 61 })
  roll?: number | null;

  @ApiProperty({ type: String, required: false, nullable: true, example: 'm' })
  difficulty?: string | null;

  @ApiProperty({ type: Number, required: false, nullable: true, description: 'Penalties of the defender', example: -10 })
  penalty?: number | null;

  @ApiProperty({ type: Number, required: false, nullable: true, example: 96 })
  total?: number | null;

  @ApiProperty({ type: String, required: false, nullable: true, description: 'Result of the absolute table', example: 'success' })
  result?: string | null;

  @ApiProperty({ type: Boolean, required: false, nullable: true, description: 'Null while pending' })
  passed?: boolean | null;

  @ApiProperty({ required: false, description: 'Decided by the game master without a roll' })
  manual?: boolean;

  static fromEntity(entity: ShieldManeuver): ShieldManeuverDto {
    const dto = new ShieldManeuverDto();
    Object.assign(dto, entity, {
      modifiers: (entity.modifiers ?? []).map(modifier => KeyValueModifierDto.fromEntity(modifier)),
      passed: entity.passed ?? null,
    });
    return dto;
  }
}

export class ActionAttackDto {
  @ApiProperty({ description: 'Name of the attack', example: 'mainHand' })
  public attackName: string;

  @ApiProperty({ description: 'Attack type', example: 'melee' })
  public type: string;

  @ApiProperty({ description: 'Modifiers for the attack' })
  public modifiers: ActionAttackModifiersDto;

  @ApiProperty({ description: 'The attack roll' })
  public roll: ActionAttackRollDto | undefined;

  @ApiProperty({ description: 'Calculated attack values' })
  public calculated: ActionAttackCalculatedDto | undefined;

  @ApiProperty({ description: 'Attack results' })
  public results: ActionAttackResultsDto | undefined;

  @ApiProperty({
    type: String,
    description: 'What the attack is waiting for',
    enum: ['pending_attack_roll', 'pending_critical_roll', 'pending_fumble_roll', 'pending_apply', 'completed'],
    example: 'pending_attack_roll',
  })
  public status: AttackStatus;

  @ApiProperty({ type: ActionAttackReactionDto, required: false, description: 'Reaction talent of the attack (spec 076)' })
  public reaction?: ActionAttackReaction;

  @ApiProperty({ type: ShieldManeuverDto, required: false, description: 'Shield maneuver of the defender (spec 077)' })
  public shieldManeuver?: ShieldManeuverDto;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackName = entity.attackName;
    dto.type = entity.type;
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.status = entity.status;
    if (entity.reaction) dto.reaction = { ...entity.reaction };
    if (entity.shieldManeuver) dto.shieldManeuver = ShieldManeuverDto.fromEntity(entity.shieldManeuver);
    dto.roll = entity.roll ? ActionAttackRollDto.fromEntity(entity.roll) : undefined;
    dto.results = entity.results ? ActionAttackResultsDto.fromEntity(entity.results) : undefined;
    dto.calculated = entity.calculated ? ActionAttackCalculatedDto.fromEntity(entity.calculated) : undefined;
    return dto;
  }
}
