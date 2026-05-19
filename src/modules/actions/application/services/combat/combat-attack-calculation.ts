import {
  Cover,
  Dodge,
  PositionalSource,
  PositionalTarget,
  RestrictedQuarters,
} from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttackResult } from '../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { AttackStatus } from '../../../domain/value-objects/attack-status.vo';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';

export interface CombatAttackSituationalModifiers {
  cover: Cover;
  restrictedQuarters: RestrictedQuarters;
  positionalSource: PositionalSource;
  positionalTarget: PositionalTarget;
  dodge: Dodge;
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

export interface CombatAttackSourceTrait {
  id: string;
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
  rollModifiers: KeyValueModifier[];
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
  criticalAdjustment: number | undefined;
}

export interface CombatAttackCalculatedResult {
  id?: string;
  calculated: {
    rollModifiers: Array<{ key: string; value: number }>;
    rollTotal: number;
    criticalAdjustment: number | undefined;
  };
  results: ActionAttackResult | undefined;
  status: AttackStatus;
  location?: AttackLocation;
}
