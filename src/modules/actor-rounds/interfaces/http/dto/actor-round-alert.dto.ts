import { ApiProperty } from '@nestjs/swagger';
import type { ActorRoundAlertStatus } from '../../../domain/value-objects/actor-round-alert-status.vo.js';
import type { ActorRoundAlertType } from '../../../domain/value-objects/actor-round-alert-type.vo.js';
import { ActorRoundAlert, type ReactionTraitId } from '../../../domain/value-objects/actor-round-alert.vo.js';
import type { GamePhase } from '../../../../games/domain/value-objects/game-phase.vo.js';

/** Workspace spec 076: the reaction a `reaction-available` alert offers. */
export class ReactionAlertDto {
  @ApiProperty({ type: String, enum: ['riposte', 'opportunistic-strike'], example: 'riposte' })
  traitId: ReactionTraitId;

  @ApiProperty({ description: 'Action that triggered the reaction' })
  triggerActionId: string;

  @ApiProperty({ description: 'Actor the reaction attacks' })
  targetActorId: string;

  @ApiProperty({ type: Number, nullable: true, description: 'Fixed OB of the attack (Riposte); null: the OB of the actor', example: 15 })
  obOverride: number | null;

  @ApiProperty({ example: 1 })
  round: number;

  @ApiProperty({ type: String, description: 'Game phase it was raised in: it expires when the phase ends', example: 'phase_2' })
  phase: GamePhase;
}
import { ActorRoundAlertModifierDto } from './actor-round-alert-modifier.dto.js';

export class ActorRoundAlertDto {
  @ApiProperty({ description: 'Alert identifier', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' })
  id: string;

  @ApiProperty({ type: String, description: 'Type of alert', example: 'endurance' })
  type: ActorRoundAlertType;

  @ApiProperty({ description: 'Message of alert', example: 'High stamina', required: true })
  message: string;

  @ApiProperty({
    description: 'Optional modifiers applied to the alert',
    type: [ActorRoundAlertModifierDto],
    required: false,
  })
  modifiers: ActorRoundAlertModifierDto[] | null;

  @ApiProperty({ type: String, description: 'Status of the alert', enum: ['pending', 'resolved', 'expired'], example: 'pending' })
  status: ActorRoundAlertStatus;

  @ApiProperty({ type: ReactionAlertDto, required: false, description: 'Reaction of a reaction-available alert (spec 076)' })
  reaction?: ReactionAlertDto;

  static fromEntity(alert: ActorRoundAlert): ActorRoundAlertDto {
    const modifiers = alert.modifiers ? alert.modifiers.map(m => ActorRoundAlertModifierDto.fromEntity(m)) : null;
    const dto = new ActorRoundAlertDto();
    dto.id = alert.id;
    dto.type = alert.type;
    dto.message = alert.message;
    dto.modifiers = modifiers;
    dto.status = alert.status;
    if (alert.reaction) dto.reaction = { ...alert.reaction };
    return dto;
  }
}
