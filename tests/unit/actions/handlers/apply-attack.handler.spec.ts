import { describe, expect, it, jest } from '@jest/globals';
import type { CommandBus } from '@nestjs/cqrs';
import { ApplyAttackCommand } from '../../../../src/modules/actions/application/cqrs/commands/apply-attack.command';
import { ApplyAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/apply-attack.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo';
import { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import { DeclareActorParryCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/declare-actor-parry.command';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { load } from '../../actor-rounds/actor-round-test.factory';
import { AddEffectsCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/add-effects.command';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-effect.vo';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-trait.vo';
import { ActionAttackResult, AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { Critical } from '../../../../src/modules/actions/domain/value-objects/critical.vo';
import { CriticalEffect, CriticalResult } from '../../../../src/modules/actions/domain/value-objects/critical-result.vo';

const appliedAttack = (attackName: string, modifiers: KeyValueModifier[]) =>
  ({
    attackName,
    type: 'melee',
    modifiers: { targetId: 'defender', bo: 0 },
    calculated: { rollModifiers: modifiers, rollTotal: 0 },
    status: 'pending_apply',
    protectors: null,
  }) as unknown as ActionAttack;

interface TalentOptions {
  sourceTraits?: ActorRoundTrait[];
  targetTraits?: ActorRoundTrait[];
  sourceEffects?: ActorRoundEffect[];
}

const setup = (attacks: ActionAttack[], parries: ActionParry[] = [], blocks: [number, number] = [1, 0], talents: TalentOptions = {}) => {
  const source = Object.assign(
    load({
      traits: talents.sourceTraits,
      effects: talents.sourceEffects,
      attacks: [
        new ActorRoundAttack(
          'mainHand',
          [],
          60,
          60,
          'melee',
          'arming-sword',
          'melee-one-hand',
          0,
          3,
          false,
          1,
          null,
          false,
          'standard',
          'melee-weapon@blade',
        ),
      ],
    }),
    { id: 'attacker-round', actorId: 'attacker' },
  );
  const target = Object.assign(load({ shield: new ActorRoundShield(20, ...blocks), traits: talents.targetTraits }), {
    id: 'defender-round',
    actorId: 'defender',
  });
  const action = Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'attacker',
    round: 1,
    actionType: 'melee_attack',
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'pending_apply',
    actionPoints: 4,
    movement: null,
    attacks,
    parries,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner',
    createdAt: new Date(),
    updatedAt: null,
  });
  const actionRepository = {
    findById: jest.fn(() => Promise.resolve(action)),
    findByRsql: jest.fn(() => Promise.resolve({ content: [] })),
    update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const update = jest.fn<(id: string, actor: unknown) => Promise<void>>(() => Promise.resolve());
  const actorRoundRepository = {
    findByRsql: jest.fn(() => Promise.resolve({ content: [source, target] })),
    findById: jest.fn((id: string) => Promise.resolve([source, target].find(actor => actor.id === id))),
    update,
  } as unknown as ActorRoundRepository;
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve({ round: 1, strategicGameId: 'sg-1', getActionPhase: () => 4 })),
  } as unknown as GameRepository;
  const strategicGame = { findById: jest.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient;
  const execute = jest.fn((command: unknown) => Promise.resolve(command));
  const handler = new ApplyAttackHandler(
    gameRepository,
    actionRepository,
    actorRoundRepository,
    strategicGame,
    { publish: jest.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort,
    { execute } as unknown as CommandBus,
  );
  const run = () => handler.execute(new ApplyAttackCommand('action-1', 'user', []));
  /** Effects commands sent to each actor round, by actor round id. */
  const effectCommands = () =>
    new Map(
      execute.mock.calls
        .map(([command]) => command)
        .filter((command): command is AddEffectsCommand => command instanceof AddEffectsCommand)
        .map(command => [command.actorRoundId, command]),
    );
  return { run, source, target, update, execute, effectCommands };
};

/** A melee attack applied with one critical and its effects. */
const criticalAttack = (effects: CriticalEffect[], targetId = 'defender') =>
  ({
    ...appliedAttack('mainHand', []),
    modifiers: { targetId, bo: 0 },
    results: new ActionAttackResult(
      new AttackTableEntry('10BS', 10, 'S', 'B'),
      [new Critical('s_b_1', 'completed', 'S', 'B', 50, new CriticalResult('Hit.', 3, 'arm', effects))],
      undefined,
    ),
  }) as unknown as ActionAttack;

const bleeding = (value: number) => ({ status: 'bleeding', value, rounds: undefined }) as unknown as CriticalEffect;

const pressingEffect = (targetActorId: string) =>
  new ActorRoundEffect('pressing-1', 'pressing-advantage', 10, undefined, 1, undefined, undefined, targetActorId);

describe('ApplyAttackHandler', () => {
  it('spends a shield block for each attack the shield covered (§9.6 Shields)', async () => {
    const { run, target, update } = setup(
      [appliedAttack('mainHand', [new KeyValueModifier('shield', -20)]), appliedAttack('offHand', [new KeyValueModifier('bo', 60)])],
      [],
      [2, 0],
    );

    await run();

    expect(target.defense.shield!.currentBlocks).toBe(1);
    expect(update).toHaveBeenCalledWith(target.id, target);
  });

  it('does not spend a block the shield no longer has', async () => {
    const { run, target } = setup([appliedAttack('mainHand', [new KeyValueModifier('shield-block', -10)])], [], [1, 1]);

    await expect(run()).resolves.toBeDefined();
    expect(target.defense.shield!.currentBlocks).toBe(1);
  });

  it('does not spend again the OB of a parry carried over from an earlier action', async () => {
    const parries = [
      new ActionParry('p-1', 'defender', 'defender', 'parry', 30, 30, undefined, undefined, true),
      new ActionParry('p-2', 'helper', 'defender', 'protect', 50, 10, -25, 'other'),
    ];
    const { run, execute } = setup([appliedAttack('mainHand', [])], parries);

    await run();

    const declared = execute.mock.calls
      .map(([command]) => command)
      .filter((command): command is DeclareActorParryCommand => command instanceof DeclareActorParryCommand);
    expect(declared.map(command => [command.actorId, command.parry])).toEqual([['helper', 35]]);
  });

  describe('talents', () => {
    it('lowers each new bleeding of a Slow Bleeder by its tier, dropping the ones left at 0', async () => {
      const { run, effectCommands } = setup([criticalAttack([bleeding(1), bleeding(3)])], [], [1, 0], {
        targetTraits: [new ActorRoundTrait('slow-bleeder', 1, null)],
      });

      await run();

      expect(
        effectCommands()
          .get('defender-round')!
          .effects.map(e => [e.status, e.value]),
      ).toEqual([['bleeding', 2]]);
    });

    it('raises each new bleeding of a Rapid Bleeder by its tier', async () => {
      const { run, effectCommands } = setup(
        [criticalAttack([bleeding(1), { status: 'stunned', value: -25, rounds: 1 } as CriticalEffect])],
        [],
        [1, 0],
        {
          targetTraits: [new ActorRoundTrait('rapid-bleeder', 2, null)],
        },
      );

      await run();

      expect(
        effectCommands()
          .get('defender-round')!
          .effects.map(e => [e.status, e.value]),
      ).toEqual([
        ['bleeding', 3],
        ['stunned', -25],
      ]);
    });

    it('gives Pressing the Advantage against the foe after inflicting a critical with a matching weapon', async () => {
      const { run, effectCommands } = setup([criticalAttack([])], [], [1, 0], {
        sourceTraits: [new ActorRoundTrait('pressing-the-advantage', 2, 'blade')],
      });

      await run();

      const command = effectCommands().get('attacker-round')!;
      expect(command.effects.map(e => [e.status, e.value, e.targetActorId])).toEqual([['pressing-advantage', 20, 'defender']]);
      expect(command.consumedEffectIds).toEqual([]);
    });

    it('does not give it for another weapon type or without a critical', async () => {
      const other = setup([criticalAttack([])], [], [1, 0], { sourceTraits: [new ActorRoundTrait('pressing-the-advantage', 1, 'hafted')] });
      await other.run();
      expect(other.effectCommands().get('attacker-round')).toBeUndefined();

      const noCritical = setup([appliedAttack('mainHand', [])], [], [1, 0], {
        sourceTraits: [new ActorRoundTrait('pressing-the-advantage', 1, null)],
      });
      await noCritical.run();
      expect(noCritical.effectCommands().get('attacker-round')).toBeUndefined();
    });

    it('uses up the Pressing the Advantage of an attack against that foe', async () => {
      const { run, effectCommands } = setup([appliedAttack('mainHand', [])], [], [1, 0], { sourceEffects: [pressingEffect('defender')] });

      await run();

      const command = effectCommands().get('attacker-round')!;
      expect(command.consumedEffectIds).toEqual(['pressing-1']);
      expect(command.effects).toEqual([]);
    });

    it('keeps the Pressing the Advantage against another foe', async () => {
      const { run, effectCommands } = setup([appliedAttack('mainHand', [])], [], [1, 0], { sourceEffects: [pressingEffect('orc-2')] });

      await run();

      expect(effectCommands().get('attacker-round')).toBeUndefined();
    });

    it('gives a Non-violent attacker a penalty stamped with the round of the critical', async () => {
      const { run, effectCommands } = setup([criticalAttack([])], [], [1, 0], {
        sourceTraits: [new ActorRoundTrait('non-violent', 2, null)],
      });

      await run();

      const effects = effectCommands().get('attacker-round')!.effects;
      expect(effects.map(e => [e.status, e.value, e.rounds, e.appliedRound])).toEqual([['non-violent', -40, undefined, 1]]);
    });

    it('uses up the effect and applies the penalty in the next round only, through the actor round', async () => {
      const { run, source, effectCommands } = setup([criticalAttack([])], [], [1, 0], {
        sourceTraits: [new ActorRoundTrait('non-violent', 1, null)],
        sourceEffects: [pressingEffect('defender')],
      });
      await run();
      const command = effectCommands().get('attacker-round')!;

      source.consumeEffects(command.consumedEffectIds);
      source.applyAttackResults(command.dmg, command.effects, undefined, command.application);

      expect(source.effects.map(e => e.status)).toEqual(['non-violent']);
      expect(source.getPenaltiesBySource()).toEqual([]);
    });
  });
});
