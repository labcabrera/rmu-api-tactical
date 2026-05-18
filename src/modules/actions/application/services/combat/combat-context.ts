import type { Action } from '../../../domain/aggregates/action.aggregate';
import type { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type { AttackResponse } from '../../ports/attack.port';

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
  location?: AttackLocation;
  attackResponse?: AttackResponse;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
  trace: CombatTraceEntry[];
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
