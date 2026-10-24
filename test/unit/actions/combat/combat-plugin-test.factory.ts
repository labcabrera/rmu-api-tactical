import { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import {
  ActorRoundAttack,
  AttackRange,
  type WeaponCategory,
} from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ActorRoundDefenseMode } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundPenalty } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-penalty.vo.js';
import { ActorRoundPenaltyModifier } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-penalty-modifier.vo.js';
import type { ActorRoundPenaltySource } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-penalty-source.vo.js';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import {
  ActionAttackModifiers,
  type AttackType,
  type CalledShot,
} from '../../../../src/modules/actions/domain/value-objects/action-attack-modifiers.vo.js';
import { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import type {
  CombatAttackPreparation,
  CombatAttackSituationalModifiers,
  CombatAttackSourceSkill,
} from '../../../../src/modules/actions/application/services/combat/combat-attack-calculation.js';
import type { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context.js';
import type { CombatPhase } from '../../../../src/modules/actions/application/services/combat/combat-phase.js';
import type { CombatPlugin } from '../../../../src/modules/actions/application/services/combat/combat-plugin.js';

export interface CombatDefenseOptions {
  bd?: number;
  at?: number | null;
  headAt?: number | null;
  bodyAt?: number | null;
  armsAt?: number | null;
  legsAt?: number | null;
}

export interface CombatPluginContextOptions {
  attackType?: AttackType;
  actionPoints?: number;
  freeAction?: boolean;
  attackNumber?: number;
  targetsNumber?: number;
  calledShot?: CalledShot;
  calledShotPenalty?: number;
  pace?: string;
  bo?: number;
  range?: number;
  customBonus?: number;
  gameLethality?: number;
  parry?: number;
  sourceSkills?: CombatAttackSourceSkill[];
  /** Traits in the actor rounds of the attacker and of the defender. */
  sourceTraits?: ActorRoundTrait[];
  targetTraits?: ActorRoundTrait[];
  /** Weapon skill of the source attack, such as `melee-weapon@blade`. */
  skillId?: string | null;
  /** Effects in the actor rounds. */
  sourceEffects?: ActorRoundEffect[];
  targetEffects?: ActorRoundEffect[];
  /** Attacks of the defender's actor round. */
  targetAttacks?: ActorRoundAttack[];
  /** Actions of the round (the defender's declared attacks). */
  roundActions?: Action[];
  targetSkills?: CombatAttackSourceSkill[];
  /** Target's declared dodge and block. */
  defenseMode?: ActorRoundDefenseMode;
  /** Target's armour and encumbrance penalty. */
  targetMovementPenalty?: number;
  targetPenalties?: Array<{ source: ActorRoundPenaltySource; value: number }>;
  /** Source attack: wielded with both hands, and its weapon category. */
  twoHanded?: boolean;
  weaponCategory?: WeaponCategory;
  /** The other attacks of the action, after the source's (for katas). */
  otherAttacks?: ActorRoundAttack[];
  reservedShieldBlocks?: number;
  sourceSize?: number;
  targetSize?: number;
  /** Penalties in the attacker's actor round. */
  sourcePenalties?: Array<{ source: ActorRoundPenaltySource; value: number }>;
  shield?: ActorRoundShield | null;
  defense?: CombatDefenseOptions;
  /** Source attack in the actor round: size adjustment, fumble and ranges. */
  attackSize?: number;
  fumble?: number;
  ranges?: AttackRange[] | null;
  /** Declared attack modifiers (flags such as proneTarget, stunnedFoe, disabledParry...). */
  modifiers?: Partial<ActionAttackModifiers>;
  situationalModifiers?: Partial<CombatAttackSituationalModifiers>;
}

export function createCombatPluginContext(options: CombatPluginContextOptions = {}): CombatContext {
  const attackType = options.attackType ?? 'melee';
  const sourceAttack = new ActorRoundAttack(
    'Longsword',
    [],
    75,
    75,
    attackType === 'melee' ? 'melee' : 'ranged',
    'arming-sword',
    'melee-one-hand',
    options.attackSize ?? 0,
    options.fumble ?? 3,
    false,
    null,
    options.ranges ?? null,
    options.twoHanded ?? false,
    options.weaponCategory ?? 'standard',
    options.skillId ?? null,
  );
  const sourceActor = createAttacker({
    size: options.sourceSize,
    attacks: [sourceAttack],
    penalties: options.sourcePenalties,
    traits: options.sourceTraits,
    effects: options.sourceEffects,
  });
  const targetActor = createDefender({
    traits: options.targetTraits,
    effects: options.targetEffects,
    attacks: options.targetAttacks,
    size: options.targetSize,
    shield: options.shield,
    defense: options.defense,
    defenseMode: options.defenseMode,
    movementPenalty: options.targetMovementPenalty,
    penalties: options.targetPenalties,
  });
  const attack = createAttack({ ...options, attackType, targetId: targetActor.actorId });

  return {
    action: createAction(sourceActor.actorId, attack, options.freeAction),
    attack,
    actors: [sourceActor, targetActor],
    sourceActor,
    targetActor,
    sourceAttack,
    attackNumber: options.attackNumber ?? 1,
    targetsNumber: options.targetsNumber ?? 1,
    gameLethality: options.gameLethality ?? 0,
    sourceSkills: options.sourceSkills ?? [],
    sourceTraits: options.sourceTraits ?? [],
    targetTraits: options.targetTraits ?? [],
    roundActions: options.roundActions ?? [],
    earlierAttacks: [],
    targetSkills: options.targetSkills ?? [],
    kataAttacks: [sourceAttack, ...(options.otherAttacks ?? [])],
    reservedShieldBlocks: options.reservedShieldBlocks ?? 0,
    attackPreparation: createAttackPreparation(sourceActor, targetActor, attack, options),
    trace: [],
  };
}

/** Runs the hook of a plugin as the processor does: apply() only when its condition holds. Returns whether it ran. */
export async function runPluginHook(plugin: CombatPlugin, phase: CombatPhase, ctx: CombatContext, index = 0): Promise<boolean> {
  const hook = plugin.hooks[phase]![index];
  if (hook.condition && !(await hook.condition(ctx))) {
    return false;
  }
  ctx.plugin = { source: plugin.id, group: plugin.group };
  await hook.apply(ctx);
  ctx.plugin = undefined;
  return true;
}

export function getModifier(modifiers: KeyValueModifier[] | undefined, key: string): KeyValueModifier | undefined {
  return modifiers?.find(modifier => modifier.key === key);
}

/** Roll modifiers of the context as `{key: value}`, for compact assertions. */
export function rollModifierValues(ctx: CombatContext): Record<string, number> {
  const modifiers = ctx.attackPreparation?.modifiers.rollModifiers ?? ctx.attack?.calculated?.rollModifiers ?? [];
  return Object.fromEntries(modifiers.map(modifier => [modifier.key, modifier.value]));
}

/** Actor rounds with the aggregate's methods but only the fields the combat rules read. */
const actorRound = (fields: Record<string, unknown>): ActorRound =>
  Object.assign(Object.create(ActorRound.prototype) as ActorRound, { apLedger: [], apModifiers: [], apCapacity: [1, 1, 1, 1] }, fields);

const penaltyOf = (penalties: Array<{ source: ActorRoundPenaltySource; value: number }> = []) =>
  new ActorRoundPenalty(penalties.map(({ source, value }, index) => new ActorRoundPenaltyModifier(`penalty-${index}`, source, value)));

export function createAttacker(
  options: {
    size?: number;
    attacks?: ActorRoundAttack[];
    penalties?: Array<{ source: ActorRoundPenaltySource; value: number }>;
    traits?: ActorRoundTrait[];
    effects?: ActorRoundEffect[];
  } = {},
): ActorRound {
  return actorRound({
    id: 'attacker-round-1',
    actorId: 'attacker-1',
    size: options.size ?? 0,
    defense: { bd: 0, shield: null },
    attacks: options.attacks ?? [],
    penalty: penaltyOf(options.penalties),
    effects: options.effects ?? [],
    alerts: [],
    traits: options.traits ?? [],
  });
}

export function createDefender(
  options: {
    size?: number;
    shield?: ActorRoundShield | null;
    defense?: CombatDefenseOptions;
    defenseMode?: ActorRoundDefenseMode;
    movementPenalty?: number;
    penalties?: Array<{ source: ActorRoundPenaltySource; value: number }>;
    traits?: ActorRoundTrait[];
    effects?: ActorRoundEffect[];
    attacks?: ActorRoundAttack[];
  } = {},
): ActorRound {
  return actorRound({
    actorId: 'defender-1',
    size: options.size ?? 0,
    defenseMode: options.defenseMode ?? ActorRoundDefenseMode.none(),
    movement: { bmr: 20, penalty: options.movementPenalty ?? 0, maxPace: 'dash', baseDifficulty: 'm' },
    defense: {
      bd: 25,
      at: 1,
      headAt: 1,
      bodyAt: 1,
      armsAt: 1,
      legsAt: 1,
      shield: options.shield ?? null,
      protect: 0,
      ...options.defense,
    },
    attacks: options.attacks ?? [],
    penalty: penaltyOf(options.penalties),
    effects: options.effects ?? [],
    alerts: [],
    traits: options.traits ?? [],
  });
}

function createAction(actorId: string, attack: ActionAttack, freeAction = false): Action {
  return Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId,
    round: 1,
    actionType: attack.type === 'melee' ? 'melee_attack' : 'ranged_attack',
    freeAction,
    phaseStart: 1,
    phaseEnd: null,
    status: 'declared',
    actionPoints: 4,
    movement: null,
    attacks: [attack],
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: null,
  });
}

function createAttack(options: CombatPluginContextOptions & { targetId: string; attackType: AttackType }): ActionAttack {
  const modifiers = new ActionAttackModifiers(
    options.targetId,
    options.bo ?? 75,
    options.parry ?? 0,
    options.calledShot ?? 'none',
    options.calledShotPenalty ?? 0,
    'none',
    'none',
    'none',
    'none',
    false,
    false,
    false,
    options.pace,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    options.range,
    options.customBonus ?? 0,
    'none',
  );
  Object.assign(modifiers, options.modifiers);
  return new ActionAttack('Longsword', options.attackType, modifiers, undefined, undefined, undefined, 'pending_attack_roll', null);
}

function createAttackPreparation(
  sourceActor: ActorRound,
  targetActor: ActorRound,
  attack: ActionAttack,
  options: CombatPluginContextOptions,
): CombatAttackPreparation {
  const defense = targetActor.defense;
  return {
    gameId: 'game-1',
    actionId: 'action-1',
    sourceId: sourceActor.actorId,
    targetId: targetActor.actorId,
    criticalAdjustment: undefined,
    modifiers: {
      attackType: attack.type,
      bo: attack.modifiers.bo || 0,
      bd: defense.bd,
      range: attack.modifiers.range,
      pace: attack.modifiers.pace,
      calledShotPenalty: attack.modifiers.calledShotPenalty || 0,
      customBonus: attack.modifiers.customBonus || 0,
      attackTable: 'arming-sword',
      attackSize: options.attackSize ?? 0,
      fumbleTable: 'melee-one-hand',
      armor: {
        at: defense.at,
        headAt: defense.headAt,
        bodyAt: defense.bodyAt,
        armsAt: defense.armsAt,
        legsAt: defense.legsAt,
      },
      actionPoints: options.actionPoints ?? 4,
      fumble: options.fumble ?? 3,
      calledShot: attack.modifiers.calledShot,
      rollModifiers: [],
      criticalModifiers: [],
      situationalModifiers: {
        cover: 'none',
        restrictedQuarters: 'none',
        positionalSource: 'none',
        positionalTarget: 'none',
        disabledDB: false,
        disabledShield: false,
        disabledParry: false,
        sizeDifference: sourceActor.size - targetActor.size,
        higherGround: false,
        sourceStatus: [],
        targetStatus: [],
        ...options.situationalModifiers,
      },
      sourceSkills: options.sourceSkills ?? [],
    },
  };
}
