import type { Action } from '../../../domain/aggregates/action.js';
import type { FreeMovementPace } from '../../../domain/services/free-movement-pace.js';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import type { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import type { ActionAttack, AttackTableEntry } from '../../../domain/value-objects/action-attack.vo.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import type {
  CombatAttackCalculatedResult,
  CombatAttackPreparation,
  CombatAttackSourceSkill,
  CombatAttackSourceTrait,
} from './combat-attack-calculation.js';
import type { CombatModifierOrigin } from './combat-modifier-bag.js';
import type { SkippedRule } from '../../../domain/value-objects/skipped-rule.vo.js';
import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import type { CriticalLocationRange } from '../../../domain/services/critical-location.js';

export interface CombatTraceEntry {
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CombatContext {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  /** First die of the open-ended attack roll; `attackRoll` when the client did not send it. */
  unmodifiedRoll?: number;
  /** Every die of the open-ended attack roll, in order, when the client sent them. */
  attackDice?: number[];
  rollTotal?: number;
  /** The unmodified attack roll is a fumble: set before `beforeAttackRoll`. */
  fumbled?: boolean;
  /**
   * Workspace spec 077, decision B2.1: the unmodified critical roll sent with the attack roll, which decides the location
   * hit on a target with armour by location.
   */
  locationRoll?: number;
  /** The roll → location map of the critical tables, read when a location roll decides the location. */
  criticalLocations?: CriticalLocationRange[];
  location?: AttackLocation;
  sourceActor?: ActorRound;
  targetActor?: ActorRound;
  sourceAttack?: ActorRoundAttack;
  actors?: ActorRound[];
  sourceSkills?: CombatAttackSourceSkill[];
  /** Traits of the source and of the target, from their actor rounds. */
  sourceTraits?: CombatAttackSourceTrait[];
  targetTraits?: CombatAttackSourceTrait[];
  /** Actions of the round of the actors in the attack (the target's declared melee attacks, for Foiler). */
  roundActions?: Action[];
  /** Attacks of the action prepared before this one. */
  earlierAttacks?: ActionAttack[];
  /** Combat skills of the target (dodging, blocking): empty when it has no character sheet. */
  targetSkills?: CombatAttackSourceSkill[];
  /** The source's attacks used in the action, in order: the first is the primary one unless another is `mainHand`. */
  kataAttacks?: ActorRoundAttack[];
  /** Shield blocks of the target already taken by earlier attacks of this action (§9.6 Shields). */
  reservedShieldBlocks?: number;
  attackNumber?: number;
  targetsNumber?: number;
  gameLethality?: number;
  /** Ambient light of the tactical game (workspace spec 076, P6); null or missing when it has none. */
  light?: LightType | null;
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
  /** Rules that did not apply, with the reason (spec 051). */
  skipped?: SkippedRule[];
  /** Plugins applied, in order, with the phase. */
  trace: CombatTraceEntry[];
}

export interface CombatPrepareAttackInput {
  action: Action;
  attack: ActionAttack;
  actors: ActorRound[];
  sourceSkills: CombatAttackSourceSkill[];
  targetSkills: CombatAttackSourceSkill[];
  roundActions: Action[];
  earlierAttacks: ActionAttack[];
  kataAttacks: ActorRoundAttack[];
  reservedShieldBlocks: number;
  attackNumber: number;
  targetsNumber: number;
  gameLethality: number;
  /** Ambient light of the tactical game (workspace spec 076, P6). */
  light?: LightType | null;
  /** Workspace spec 080: the free movement of the attacker that overlaps the attack, whose pace counts. */
  movementPace?: FreeMovementPace | null;
}

export interface CombatResolutionInput {
  action: Action;
  attack?: ActionAttack;
  attackRoll?: number;
  criticalKey?: string;
  criticalRoll?: number;
  fumbleRoll?: number;
}
