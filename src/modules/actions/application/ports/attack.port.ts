import { ActionAttackResult } from '../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../domain/value-objects/attack-location.vo';
import {
  CoverType,
  DodgeType,
  PositionalSourceType,
  PositionalTargetType,
  RestrictedQuartersType,
} from '../cqrs/commands/prepare-attack.command';

export interface AttackPort {
  updateRoll(attackId: string, roll: number, location: AttackLocation | undefined): Promise<AttackResponse>;
  updateParry(attackId: string, parry: number): Promise<AttackResponse>;
  updateCriticalRoll(attackId: string, criticalKey: string, roll: number): Promise<AttackResponse>;
  prepareAttack(actionId: AttackCreationRequest): Promise<AttackResponse>;
  deleteAttack(actionId: string): Promise<void>;
}

export interface AttackRollModifiers {
  bo: number;
  bd: number;
  injuryPenalty: number;
  fatiguePenalty: number;
  rangePenalty: number | undefined;
  shield: number | undefined;
  parry: number | undefined;
  attackNumber: number | undefined;
  attackTargets: number | undefined;
  gameLethality: number | undefined;
  customBonus: number | undefined;
}

export interface AttackSituationalModifiers {
  cover: CoverType;
  restrictedQuarters: RestrictedQuartersType;
  positionalSource: PositionalSourceType;
  positionalTarget: PositionalTargetType;
  dodge: DodgeType;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  sizeDifference: number;
  offHand: boolean;
  twoHandedWeapon: boolean;
  sourceStatus: string[];
  targetStatus: string[];
}

export interface AttackFeature {
  key: string;
  value: string;
}

export interface AttackSourceSkill {
  skillId: string;
  bonus: number;
}

export interface AttackModifiers {
  attackType: string;
  attackTable: string;
  attackSize: string;
  fumbleTable: string;
  armor: AttackArmor;
  actionPoints: number;
  fumble: number;
  rollModifiers: AttackRollModifiers;
  situationalModifiers: AttackSituationalModifiers;
  features: AttackFeature[];
  sourceSkills: AttackSourceSkill[];
}

export interface AttackSkill {
  skillId: string;
  bonus: number;
}

export interface AttackArmor {
  at: number | undefined;
  headAt: number | undefined;
  bodyAt: number | undefined;
  armsAt: number | undefined;
  legsAt: number | undefined;
}

export interface AttackCreationRequest {
  gameId: string;
  actionId: string;
  sourceId: string;
  targetId: string;
  modifiers: AttackModifiers;
}

export interface KeyValue {
  key: string;
  value: number;
}

export interface AttackCalculated {
  rollModifiers: KeyValue[];
  rollTotal: number;
}

export interface AttackResponse {
  id: string;
  calculated: AttackCalculated;
  results: ActionAttackResult | undefined;
}
