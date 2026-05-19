import type { Action } from '../../../domain/aggregates/action.aggregate';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import type { ActionAttack, AttackTableEntry } from '../../../domain/value-objects/action-attack.vo';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type { AttackCreationRequest, AttackResponse, AttackSourceSkill } from '../../ports/attack.port';

export interface CombatTraceEntry {
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CombatContext {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  locationRoll?: number;
  rollTotal?: number;
  location?: AttackLocation;
  sourceActor?: ActorRound;
  targetActor?: ActorRound;
  sourceAttack?: ActorRoundAttack;
  actors?: ActorRound[];
  sourceSkills?: AttackSourceSkill[];
  attackNumber?: number;
  targetsNumber?: number;
  gameLethality?: number;
  attackRequest?: AttackCreationRequest;
  attackTableEntry?: AttackTableEntry;
  attackResponse?: AttackResponse;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
  trace: CombatTraceEntry[];
}

export interface CombatPrepareAttackInput {
  action: Action;
  attack: ActionAttack;
  actors: ActorRound[];
  sourceSkills: AttackSourceSkill[];
  attackNumber: number;
  targetsNumber: number;
  gameLethality: number;
}

export interface CombatResolutionInput {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  locationRoll?: number;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
}
