import type { ActorRoundTrait } from '../../../../actor-rounds/domain/value-objets/actor-round-trait.vo';
import { Cover, PositionalSource, PositionalTarget, RestrictedQuarters } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttackResult } from '../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { AttackStatus } from '../../../domain/value-objects/attack-status.vo';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';

export interface CombatAttackSituationalModifiers {
  cover: Cover;
  restrictedQuarters: RestrictedQuarters;
  positionalSource: PositionalSource;
  positionalTarget: PositionalTarget;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  /** Sizes the attack (without the charge) is above the target, negative when it is smaller (§9.4). */
  sizeDifference: number;
  higherGround: boolean;
  sourceStatus: string[];
  targetStatus: string[];
}

/** A combat skill of an actor from its character sheet: total bonus and ranks (0 for older sheets). */
export interface CombatAttackSourceSkill {
  skillId: string;
  bonus: number;
  ranks?: number;
}

/** A trait of an actor, from its actor round. */
export type CombatAttackSourceTrait = ActorRoundTrait;

export interface CombatAttackArmor {
  at: number | null;
  headAt: number | null;
  bodyAt: number | null;
  armsAt: number | null;
  legsAt: number | null;
}

/**
 * Everything the prepare plugins read: what was declared for the attack, the target's defence and the derived
 * situation. The handler only fills it; the plugins turn it into modifiers.
 */
export interface CombatAttackPreparationModifiers {
  attackType: string;
  /** Offensive bonus used. */
  bo: number;
  /** Target's defensive bonus. */
  bd: number;
  /** Distance to the target (ranged and thrown attacks). */
  range: number | undefined;
  pace: string | undefined;
  calledShotPenalty: number;
  customBonus: number;
  attackTable: string;
  attackSize: number;
  fumbleTable: string;
  armor: CombatAttackArmor;
  actionPoints: number;
  /** Fumble range of the attack: the weapon's, which the target's Foiler widens. */
  fumble: number;
  calledShot?: string;
  rollModifiers: KeyValueModifier[];
  criticalModifiers: KeyValueModifier[];
  situationalModifiers: CombatAttackSituationalModifiers;
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
    rollModifiers: KeyValueModifier[];
    criticalModifiers: KeyValueModifier[];
    rollTotal: number;
    criticalAdjustment: number | undefined;
    fumble?: number;
  };
  results: ActionAttackResult | undefined;
  status: AttackStatus;
  location?: AttackLocation;
}
