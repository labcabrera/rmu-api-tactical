import { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
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
} from '../../../../src/modules/actions/application/services/combat/combat-attack-calculation';
import { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context';

export interface CombatPluginContextOptions {
  attackType?: AttackType;
  attackNumber?: number;
  targetsNumber?: number;
  calledShot?: CalledShot;
  calledShotPenalty?: number;
  pace?: string;
  sourceTraits?: Array<{ id: string }>;
  sourceSize?: number;
  targetSize?: number;
  shield?: ActorRoundShield | null;
  situationalModifiers?: Partial<CombatAttackSituationalModifiers>;
}

export function createCombatPluginContext(options: CombatPluginContextOptions = {}): CombatContext {
  const sourceActor = createAttacker({ size: options.sourceSize });
  const targetActor = createDefender({ size: options.targetSize, shield: options.shield });
  const attack = createAttack({
    calledShot: options.calledShot,
    calledShotPenalty: options.calledShotPenalty,
    attackType: options.attackType,
    pace: options.pace,
    targetId: targetActor.actorId,
  });

  return {
    action: createAction(sourceActor.actorId, attack),
    attack,
    actors: [sourceActor, targetActor],
    sourceActor,
    targetActor,
    attackNumber: options.attackNumber ?? 1,
    targetsNumber: options.targetsNumber ?? 1,
    sourceTraits: options.sourceTraits ?? [],
    attackPreparation: createAttackPreparation(sourceActor, targetActor, attack, options.situationalModifiers),
    trace: [],
  };
}

export function getModifier(modifiers: KeyValueModifier[], key: string): KeyValueModifier | undefined {
  return modifiers.find(modifier => modifier.key === key);
}

export function createAttacker(options: { size?: number } = {}): ActorRound {
  return {
    actorId: 'attacker-1',
    size: options.size ?? 1,
    defense: { bd: 0, shield: null },
    effects: [],
  } as unknown as ActorRound;
}

export function createDefender(options: { size?: number; shield?: ActorRoundShield | null } = {}): ActorRound {
  return {
    actorId: 'defender-1',
    size: options.size ?? 1,
    defense: {
      bd: 25,
      at: 1,
      headAt: 1,
      bodyAt: 1,
      armsAt: 1,
      legsAt: 1,
      shield: options.shield ?? null,
      protect: 0,
    },
    effects: [],
  } as unknown as ActorRound;
}

function createAction(actorId: string, attack: ActionAttack): Action {
  return Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId,
    round: 1,
    actionType: attack.type === 'melee' ? 'melee_attack' : 'ranged_attack',
    freeAction: false,
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

function createAttack(options: {
  targetId: string;
  attackType?: AttackType;
  calledShot?: CalledShot;
  calledShotPenalty?: number;
  pace?: string;
}): ActionAttack {
  return new ActionAttack(
    'Longsword',
    options.attackType ?? 'melee',
    new ActionAttackModifiers(
      options.targetId,
      75,
      0,
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
      undefined,
      0,
      'none',
    ),
    undefined,
    undefined,
    undefined,
    undefined,
    'pending_attack_roll',
    null,
  );
}

function createAttackPreparation(
  sourceActor: ActorRound,
  targetActor: ActorRound,
  attack: ActionAttack,
  situationalModifiers: Partial<CombatAttackSituationalModifiers> = {},
): CombatAttackPreparation {
  const sizeDifference = sourceActor.size - targetActor.size;

  return {
    gameId: 'game-1',
    actionId: 'action-1',
    sourceId: sourceActor.actorId,
    targetId: targetActor.actorId,
    criticalAdjustment: undefined,
    modifiers: {
      attackType: attack.type,
      attackTable: 'slash',
      attackSize: sourceActor.size,
      fumbleTable: 'melee',
      armor: {
        at: 1,
        headAt: 1,
        bodyAt: 1,
        armsAt: 1,
        legsAt: 1,
      },
      actionPoints: 4,
      fumble: 5,
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
        sizeDifference,
        offHand: false,
        twoHandedWeapon: false,
        higherGround: false,
        sourceStatus: [],
        targetStatus: [],
        ...situationalModifiers,
      },
      sourceSkills: [],
    },
  };
}
