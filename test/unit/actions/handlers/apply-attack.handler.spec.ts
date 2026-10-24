import { describe, expect, it, vi } from 'vitest';
import type { CommandBus } from '@nestjs/cqrs';
import { ApplyAttackCommand } from '../../../../src/modules/actions/application/cqrs/commands/apply-attack.command.js';
import { ApplyAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/apply-attack.handler.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { DeclareActorParryCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/declare-actor-parry.command.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { AddEffectsCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/add-effects.command.js';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ActionAttackResult, AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { Critical } from '../../../../src/modules/actions/domain/value-objects/critical.vo.js';
import { CriticalEffect, CriticalResult } from '../../../../src/modules/actions/domain/value-objects/critical-result.vo.js';

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
    findById: vi.fn(() => Promise.resolve(action)),
    findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
    update: vi.fn((updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const update = vi.fn<(id: string, actor: unknown) => Promise<void>>(() => Promise.resolve());
  const actorRoundRepository = {
    findByRsql: vi.fn(() => Promise.resolve({ content: [source, target] })),
    findById: vi.fn((id: string) => Promise.resolve([source, target].find(actor => actor.id === id))),
    update,
  } as unknown as ActorRoundRepository;
  const gameRepository = {
    findById: vi.fn(() => Promise.resolve({ round: 1, strategicGameId: 'sg-1', getActionPhase: () => 4 })),
  } as unknown as GameRepository;
  const strategicGame = { findById: vi.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient;
  const execute = vi.fn((command: unknown) => Promise.resolve(command));
  const handler = new ApplyAttackHandler(
    gameRepository,
    actionRepository,
    actorRoundRepository,
    strategicGame,
    { publish: vi.fn(() => Promise.resolve()) },
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
    expect(update).toHaveBeenCalledWith(target);
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

      const cmd = effectCommands().get('defender-round')!;
      expect(cmd.effects).toEqual([]);
      expect(cmd.injuries.map(i => i.bleeding)).toEqual([2]);
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

      const cmd = effectCommands().get('defender-round')!;
      expect(cmd.effects.map(e => [e.status, e.value])).toEqual([['stunned', -25]]);
      expect(cmd.injuries.map(i => i.bleeding)).toEqual([3]);
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

  describe('injuries (spec 013)', () => {
    const injuryAttack = (effects: CriticalEffect[], location = 'arm', injury?: CriticalResult['injury'], criticalType = 'S') =>
      ({
        ...appliedAttack('mainHand', []),
        modifiers: { targetId: 'defender', bo: 0 },
        roll: { roll: 37, criticalRolls: new Map(), fumbleRoll: undefined },
        results: new ActionAttackResult(
          new AttackTableEntry('10BS', 10, criticalType, 'B'),
          [new Critical('s_b_1', 'completed', criticalType, 'B', 91, new CriticalResult('Hit.', 3, location, effects, injury))],
          undefined,
        ),
      }) as unknown as ActionAttack;
    const penalty = (value: number) => ({ status: 'penalty', value }) as unknown as CriticalEffect;

    it('makes one injury per critical with penalty or bleeding, with type, location, side and source', async () => {
      const { run, effectCommands } = setup([
        injuryAttack([penalty(-10), bleeding(2), { status: 'stunned', value: -25, rounds: 1 } as CriticalEffect]),
      ]);

      await run();

      const cmd = effectCommands().get('defender-round')!;
      expect(cmd.location).toBe('arms');
      expect(cmd.injuries).toEqual([
        expect.objectContaining({
          type: 'cut-burn',
          severity: 'light',
          location: 'arm',
          side: 'left',
          penalty: -10,
          initialPenalty: -10,
          bleeding: 2,
          status: 'active',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- nested asymmetric matcher (typed any)
          source: expect.objectContaining({ kind: 'critical', actionId: 'action-1', attackerId: 'attacker', criticalKey: 'S-B-91' }),
        }),
      ]);
      expect(cmd.effects.map(e => [e.status, e.source?.criticalKey])).toEqual([['stunned', 'S-B-91']]);
    });

    it('takes the type and flags of the critical data, and adds its secondary injuries without penalty', async () => {
      const { run, effectCommands } = setup([
        injuryAttack([penalty(-50)], 'leg', { type: 'bone', secondary: ['muscle-tendon'], flags: ['limb-loss'] }),
      ]);

      await run();

      const injuries = effectCommands().get('defender-round')!.injuries;
      expect(injuries.map(i => [i.type, i.penalty, i.severity, i.flags])).toEqual([
        ['bone', -50, 'severe', ['limb-loss']],
        ['muscle-tendon', 0, 'severe', undefined],
      ]);
      expect(injuries[1].source).toEqual(injuries[0].source);
    });

    it('heals the penalty of a bleeding wound as a cut and keeps the type of the critical as a secondary (spec 022, D8)', async () => {
      const { run, effectCommands } = setup([
        injuryAttack([penalty(-20), bleeding(3)], 'chest', { type: 'organ', secondary: ['bone'] }, 'P'),
      ]);

      await run();

      const injuries = effectCommands().get('defender-round')!.injuries;
      expect(injuries.map(i => [i.type, i.penalty, i.bleeding ?? 0, i.severity])).toEqual([
        ['cut-burn', -20, 3, 'light'],
        ['organ', 0, 0, 'light'],
        ['bone', 0, 0, 'light'],
      ]);
    });

    it('makes no injury for a critical without penalty or bleeding', async () => {
      const { run, effectCommands } = setup([injuryAttack([{ status: 'stunned', value: -25, rounds: 1 } as CriticalEffect])]);

      await run();

      expect(effectCommands().get('defender-round')!.injuries).toEqual([]);
    });

    it('heals the attacker with a heal effect that applies to the source', async () => {
      const heal = { status: 'heal', value: 5, applyTo: 'source' } as unknown as CriticalEffect;
      const { run, effectCommands } = setup([injuryAttack([heal], 'chest', undefined, 'K')]);

      await run();

      expect(effectCommands().get('attacker-round')!.heal).toBe(5);
      expect(effectCommands().get('attacker-round')!.hpChanges).toEqual([
        { kind: 'treatment', amount: 5, criticalKey: 'K-B-91', actionId: 'action-1' },
      ]);
      expect(effectCommands().get('defender-round')!.effects).toEqual([]);
    });

    it('splits the hits of the target into the attack table damage and each critical (spec 013, §1.1)', async () => {
      const { run, effectCommands } = setup([injuryAttack([penalty(-10)])]);

      await run();

      const cmd = effectCommands().get('defender-round')!;
      expect(cmd.dmg).toBe(13);
      const attacker = { actionId: 'action-1', attackerId: 'attacker', attackerName: '' };
      expect(cmd.hpChanges).toEqual([
        { kind: 'attack', amount: -10, ...attacker },
        { kind: 'critical', amount: -3, criticalKey: 'S-B-91', ...attacker },
      ]);
    });
  });
});
