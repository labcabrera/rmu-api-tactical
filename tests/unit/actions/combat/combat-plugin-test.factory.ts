import { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack, AttackRange } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundPenalty } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty.vo';
import { ActorRoundPenaltyModifier } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty-modifier.vo';
import { ActorRoundPenaltySource } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty-source.vo';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import {
  ActionAttackModifiers,
  AttackType,
  CalledShot,
  Cover,
  Dodge,
  PositionalSource,
  PositionalTarget,
  RestrictedQuarters,
} from '../../../../src/modules/actions/domain/value-objects/action-attack-modifiers.vo';
import { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import {
  CombatAttackPreparation,
  CombatAttackSituationalModifiers,
  CombatAttackSourceSkill,
} from '../../../../src/modules/actions/application/services/combat/combat-attack-calculation';
import { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context';
import type { CombatPhase } from '../../../../src/modules/actions/application/services/combat/combat-phase';
import type { CombatPlugin } from '../../../../src/modules/actions/application/services/combat/combat-plugin';

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
  sourceTraits?: Array<{ id: string }>;
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
  );
  const sourceActor = createAttacker({ size: options.sourceSize, attacks: [sourceAttack], penalties: options.sourcePenalties });
  const targetActor = createDefender({ size: options.targetSize, shield: options.shield, defense: options.defense });
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
  Object.assign(Object.create(ActorRound.prototype) as ActorRound, fields);

const penaltyOf = (penalties: Array<{ source: ActorRoundPenaltySource; value: number }> = []) =>
  new ActorRoundPenalty(penalties.map(({ source, value }, index) => new ActorRoundPenaltyModifier(`penalty-${index}`, source, value)));

export function createAttacker(
  options: { size?: number; attacks?: ActorRoundAttack[]; penalties?: Array<{ source: ActorRoundPenaltySource; value: number }> } = {},
): ActorRound {
  return actorRound({
    id: 'attacker-round-1',
    actorId: 'attacker-1',
    size: options.size ?? 0,
    defense: { bd: 0, shield: null },
    attacks: options.attacks ?? [],
    penalty: penaltyOf(options.penalties),
    effects: [],
    alerts: [],
  });
}

export function createDefender(
  options: { size?: number; shield?: ActorRoundShield | null; defense?: CombatDefenseOptions } = {},
): ActorRound {
  return actorRound({
    actorId: 'defender-1',
    size: options.size ?? 0,
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
    attacks: [],
    penalty: penaltyOf(),
    effects: [],
    alerts: [],
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
        cover: 'none' as Cover,
        restrictedQuarters: 'none' as RestrictedQuarters,
        positionalSource: 'none' as PositionalSource,
        positionalTarget: 'none' as PositionalTarget,
        dodge: 'none' as Dodge,
        disabledDB: false,
        disabledShield: false,
        disabledParry: false,
        sizeDifference: sourceActor.size - targetActor.size,
        twoHandedWeapon: false,
        higherGround: false,
        sourceStatus: [],
        targetStatus: [],
        ...options.situationalModifiers,
      },
      sourceSkills: options.sourceSkills ?? [],
    },
  };
}
