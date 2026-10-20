import type { Action } from '../../../domain/aggregates/action.aggregate';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import type { ActionAttack, AttackTableEntry } from '../../../domain/value-objects/action-attack.vo';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type {
  CombatAttackCalculatedResult,
  CombatAttackPreparation,
  CombatAttackSourceSkill,
  CombatAttackSourceTrait,
} from './combat-attack-calculation';
import type { CombatModifierOrigin } from './combat-modifier-bag';

export interface CombatTraceEntry {
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CombatContext {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  rollTotal?: number;
  location?: AttackLocation;
  sourceActor?: ActorRound;
  targetActor?: ActorRound;
  sourceAttack?: ActorRoundAttack;
  actors?: ActorRound[];
  sourceSkills?: CombatAttackSourceSkill[];
  sourceTraits?: CombatAttackSourceTrait[];
  /** Combat skills of the target (dodging, blocking): empty when it has no character sheet. */
  targetSkills?: CombatAttackSourceSkill[];
  /** The source's attacks used in the action, in order: the first is the primary one unless another is `mainHand`. */
  kataAttacks?: ActorRoundAttack[];
  /** Shield blocks of the target already taken by earlier attacks of this action (§9.6 Shields). */
  reservedShieldBlocks?: number;
  attackNumber?: number;
  targetsNumber?: number;
  gameLethality?: number;
  attackPreparation?: CombatAttackPreparation;
  /** Armour type the attack table is looked up with (the target's, or the one of the location hit). */
  armorType?: number | null;
  attackTableEntry?: AttackTableEntry;
  /** Critical severities the table entry turns into, one critical each (an F..J result becomes several). */
  criticalSeverities?: string[];
  attackCalculation?: CombatAttackCalculatedResult;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
  /** Plugin whose hook is running; set by the processor so the modifiers it adds carry their origin. */
  plugin?: CombatModifierOrigin;
  /** Plugins applied, in order, with the phase. */
  trace: CombatTraceEntry[];
}

export interface CombatPrepareAttackInput {
  action: Action;
  attack: ActionAttack;
  actors: ActorRound[];
  sourceSkills: CombatAttackSourceSkill[];
  sourceTraits: CombatAttackSourceTrait[];
  targetSkills: CombatAttackSourceSkill[];
  kataAttacks: ActorRoundAttack[];
  reservedShieldBlocks: number;
  attackNumber: number;
  targetsNumber: number;
  gameLethality: number;
}

export interface CombatResolutionInput {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
}
