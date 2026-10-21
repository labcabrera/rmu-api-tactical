import { describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  PrepareAttackCommand,
  PrepareAttackCommandModifiers,
} from '../../../../src/modules/actions/application/cqrs/commands/prepare-attack.command';
import { PrepareAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import type { AttackTableLookupRequest, AttackTablePort } from '../../../../src/modules/actions/application/ports/attack-table.port';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatAttackSizePlugin,
  CombatContext,
  CombatFoilerPlugin,
  CombatPacePlugin,
  CombatPluginRegistryService,
  CombatPressingAdvantagePlugin,
  CombatProcessor,
  CombatSizeDifferencePlugin,
  effectivePace,
  sizeDifference,
} from '../../../../src/modules/actions/application/services/combat';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { ActionAttack, AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-effect.vo';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-trait.vo';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import { ValidationError } from '../../../../src/modules/shared/domain/errors';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { CombatPluginContextOptions, createCombatPluginContext, rollModifierValues, runPluginHook } from './combat-plugin-test.factory';

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

const meleeAttack = (attackName: string, skillId: string | null) =>
  new ActorRoundAttack(attackName, [], 60, 60, 'melee', 'arming-sword', 'melee-one-hand', 0, 3, false, 1, null, false, 'standard', skillId);

/** A melee attack action of the defender in the round, with the attacks prepared (none when only declared). */
const defenderAction = (attackNames: string[] = [], actionType: 'melee_attack' | 'ranged_attack' = 'melee_attack') =>
  Action.fromProps({
    id: 'defender-action',
    gameId: 'game-1',
    actorId: 'defender-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'declared',
    actionPoints: 4,
    movement: null,
    attacks: attackNames.map(attackName => ({ attackName, modifiers: { targetId: 'attacker-1' } }) as unknown as ActionAttack),
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner-1',
    createdAt: new Date(),
    updatedAt: null,
  });

const pressing = (targetActorId: string, value: number) =>
  new ActorRoundEffect(randomUUID(), 'pressing-advantage', value, undefined, 1, undefined, undefined, targetActorId);

const prepare = async (options: CombatPluginContextOptions) => {
  const ctx = createCombatPluginContext(options);
  for (const plugin of [CombatPacePlugin, CombatPressingAdvantagePlugin, CombatSizeDifferencePlugin, CombatFoilerPlugin]) {
    await runPluginHook(plugin, 'prepare', ctx);
  }
  return ctx;
};

describe('Combat talents', () => {
  describe('light-boned', () => {
    it('counts the target one size smaller per tier for the DB by size', async () => {
      const ctx = createCombatPluginContext({ targetTraits: [trait('light-boned', 2)] });
      ctx.attackPreparation!.modifiers.situationalModifiers.sizeDifference = sizeDifference(ctx);

      await runPluginHook(CombatSizeDifferencePlugin, 'prepare', ctx);

      expect(sizeDifference(ctx)).toBe(2);
      expect(rollModifierValues(ctx)).toEqual({ 'size-difference': -10 });
    });

    it('raises the critical severity of attacks against it', async () => {
      const ctx = createCombatPluginContext({ targetTraits: [trait('light-boned', 1)] });
      ctx.attackPreparation = undefined;
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);

      expect(ctx.attackTableEntry).toMatchObject({ damage: 7, criticalSeverity: 'C' });
    });

    it("does not change the attacker's own attacks", async () => {
      const ctx = createCombatPluginContext({ sourceTraits: [trait('light-boned', 1)] });
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      expect(sizeDifference(ctx)).toBe(0);
      expect(await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx)).toBe(false);
    });
  });

  describe('foiler', () => {
    const foiler = (overrides: CombatPluginContextOptions = {}): CombatPluginContextOptions => ({
      fumble: 3,
      targetTraits: [trait('foiler', 2, 'blade')],
      targetAttacks: [meleeAttack('sword', 'melee-weapon@blade'), meleeAttack('mace', 'melee-weapon@hafted')],
      roundActions: [defenderAction()],
      ...overrides,
    });

    it('widens the fumble range by its tier when the target has a melee attack declared with that weapon type', async () => {
      const ctx = await prepare(foiler());

      expect(ctx.attackPreparation!.modifiers.fumble).toBe(5);
      expect(rollModifierValues(ctx)).toEqual({});
    });

    it('reads the attacks prepared in the declared action', async () => {
      expect((await prepare(foiler({ roundActions: [defenderAction(['mace'])] }))).attackPreparation!.modifiers.fumble).toBe(3);
      expect((await prepare(foiler({ roundActions: [defenderAction(['sword'])] }))).attackPreparation!.modifiers.fumble).toBe(5);
    });

    it('does not apply without a melee attack declared this round', async () => {
      expect((await prepare(foiler({ roundActions: [] }))).attackPreparation!.modifiers.fumble).toBe(3);
      expect((await prepare(foiler({ roundActions: [defenderAction([], 'ranged_attack')] }))).attackPreparation!.modifiers.fumble).toBe(3);
    });

    it('does not apply to a flatfooted target', async () => {
      const ctx = await prepare(foiler({ situationalModifiers: { targetStatus: ['flatfooted'] } }));

      expect(ctx.attackPreparation!.modifiers.fumble).toBe(3);
    });

    it('uses the widened fumble range when resolving the roll', async () => {
      const ctx = createCombatPluginContext({ fumble: 3 });
      ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 80)], 80, undefined, undefined, [], undefined, 5);
      const lookup = jest.fn((request: AttackTableLookupRequest) => {
        void request;
        return Promise.resolve(new AttackTableEntry('5', 5, undefined, undefined));
      });
      const resolver = new CombatAttackRollResolverService(new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)), {
        lookup,
      } as AttackTablePort);

      await resolver.resolve({
        action: ctx.action,
        attack: ctx.attack!,
        sourceActor: ctx.sourceActor!,
        targetActor: ctx.targetActor!,
        roll: 5,
      });

      expect(ctx.attack!.results!.fumble).toBeDefined();
      expect(lookup).not.toHaveBeenCalled();
    });
  });

  describe('pressing-advantage', () => {
    it('adds the bonus of the effect to the attack against that foe', async () => {
      const ctx = await prepare({ sourceEffects: [pressing('defender-1', 20)] });

      expect(rollModifierValues(ctx)).toEqual({ 'pressing-advantage': 20 });
    });

    it('does not add it against another foe', async () => {
      const ctx = await prepare({ sourceEffects: [pressing('orc-2', 20)] });

      expect(rollModifierValues(ctx)).toEqual({});
    });

    it('adds it only to the first attack of the action against that foe', async () => {
      const ctx = createCombatPluginContext({ sourceEffects: [pressing('defender-1', 20)] });
      ctx.earlierAttacks = [ctx.attack!];

      expect(await runPluginHook(CombatPressingAdvantagePlugin, 'prepare', ctx)).toBe(false);
    });
  });

  describe('uncoordinated', () => {
    it('counts the pace one step faster per tier', () => {
      expect(effectivePace('walk', 1)).toBe('jog');
      expect(effectivePace('creep', 2)).toBe('jog');
      expect(effectivePace('run', 3)).toBe('dash');
      expect(effectivePace('jog', 0)).toBe('jog');
    });

    it('adds the penalty of the faster pace apart, offset by footwork', async () => {
      const ctx = await prepare({
        pace: 'walk',
        sourceTraits: [trait('uncoordinated', 1)],
        sourceSkills: [{ skillId: 'footwork', bonus: 30 }],
      });

      expect(rollModifierValues(ctx)).toEqual({ 'pace-penalty': -25, uncoordinated: -25, 'pace-penalty-skill': 30 });
    });

    it('gives a penalty to a creeping attacker', async () => {
      const ctx = await prepare({ pace: 'creep', sourceTraits: [trait('uncoordinated', 1)] });

      expect(rollModifierValues(ctx)).toEqual({ uncoordinated: -25 });
    });

    it('rejects the attack when the pace counts as sprint or dash', async () => {
      await expect(prepare({ pace: 'run', sourceTraits: [trait('uncoordinated', 1)] })).rejects.toThrow(ValidationError);
      await expect(prepare({ pace: 'run', sourceTraits: [trait('uncoordinated', 1)] })).rejects.toMatchObject({
        errorCode: 'err-attack-invalid-pace',
      });
    });
  });

  describe('PrepareAttackHandler', () => {
    const setup = (ctx: CombatContext, roundActions: Action[]) => {
      const actionRepository = {
        findById: jest.fn(() => Promise.resolve(ctx.action)),
        findByRsql: jest.fn(() => Promise.resolve({ content: roundActions })),
        update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository;
      const game = {
        id: 'game-1',
        round: 1,
        strategicGameId: 'sg-1',
        checkValidActionManagement: () => undefined,
        getActionPhase: () => 2, // a melee attack needs 2 AP to be prepared (spec 011)
      };
      const handler = new PrepareAttackHandler(
        { findById: jest.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
        { findByGameAndRoundAndActors: jest.fn(() => Promise.resolve(ctx.actors)) } as unknown as ActorRoundRepository,
        actionRepository,
        { findById: jest.fn(() => Promise.resolve({ skills: [], traits: [{ traitId: 'ignored' }] })) } as unknown as CharacterPort,
        { findById: jest.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient,
        { publish: jest.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort,
        new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
      );
      return () =>
        handler.execute(
          new PrepareAttackCommand(
            'action-1',
            [{ attackName: 'Longsword', modifiers: { targetId: 'defender-1', bo: 60 } as PrepareAttackCommandModifiers, protectors: null }],
            'user',
            [],
          ),
        );
    };

    it("stores the fumble range with the target's Foiler and adds the Pressing the Advantage bonus, from the actor rounds", async () => {
      const ctx = createCombatPluginContext({
        fumble: 3,
        sourceEffects: [pressing('defender-1', 10)],
        targetTraits: [trait('foiler', 1)],
        targetAttacks: [meleeAttack('sword', 'melee-weapon@blade')],
      });

      const action = await setup(ctx, [defenderAction()])();

      const calculated = action.attacks![0].calculated!;
      expect(calculated.fumble).toBe(4);
      expect(calculated.rollModifiers.find(modifier => modifier.key === 'pressing-advantage')).toMatchObject({
        value: 10,
        group: 'offense',
        source: 'pressing-advantage',
      });
    });

    it('stores the weapon fumble range without Foiler', async () => {
      const action = await setup(createCombatPluginContext({ fumble: 3 }), [])();

      expect(action.attacks![0].calculated!.fumble).toBe(3);
    });
  });
});
