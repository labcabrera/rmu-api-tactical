import { ActionAttackResult } from '../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { AttackStatus } from '../../../domain/value-objects/attack-status.vo';

export interface CombatAttackRollModifiers {
  bo: number | undefined;
  bd: number;
  calledShot?: string;
  calledShotPenalty: number | undefined;
  injuryPenalty: number;
  fatiguePenalty: number;
  rangePenalty: number | undefined;
  shield: number | undefined;
  parry: number | undefined;
  attackNumber: number | undefined;
  attackTargets: number | undefined;
  gameLethality: number | undefined;
  positionalSource: number | undefined;
  restrictedQuarters: number | undefined;
  customBonus: number | undefined;
}

export interface CombatAttackSituationalModifiers {
  cover: string;
  restrictedQuarters: string;
  positionalSource: string;
  positionalTarget: string;
  dodge: string;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  sizeDifference: number;
  offHand: boolean;
  twoHandedWeapon: boolean;
  higherGround: boolean;
  sourceStatus: string[];
  targetStatus: string[];
}

export interface CombatAttackFeature {
  key: string;
  value: string;
}

export interface CombatAttackSourceSkill {
  skillId: string;
  bonus: number;
}

export interface CombatAttackArmor {
  at: number | null;
  headAt: number | null;
  bodyAt: number | null;
  armsAt: number | null;
  legsAt: number | null;
}

export interface CombatAttackPreparationModifiers {
  attackType: string;
  attackTable: string;
  attackSize: number;
  fumbleTable: string;
  armor: CombatAttackArmor;
  actionPoints: number;
  fumble: number;
  calledShot?: string;
  rollModifiers: CombatAttackRollModifiers;
  situationalModifiers: CombatAttackSituationalModifiers;
  features: CombatAttackFeature[];
  sourceSkills: CombatAttackSourceSkill[];
}

export interface CombatAttackPreparation {
  gameId: string;
  actionId: string;
  sourceId: string;
  targetId: string;
  modifiers: CombatAttackPreparationModifiers;
}

export interface CombatAttackCalculatedResult {
  id?: string;
  calculated: {
    rollModifiers: Array<{ key: string; value: number }>;
    rollTotal: number;
  };
  results: ActionAttackResult | undefined;
  status: AttackStatus;
  location?: AttackLocation;
}
