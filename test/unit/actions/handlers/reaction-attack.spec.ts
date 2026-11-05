import { describe, expect, it, vi } from 'vitest';
import {
  PrepareAttackCommand,
  type PrepareAttackCommandModifiers,
} from '../../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { UpdateAttackRollCommand } from '../../../../src/modules/actions/application/cqrs/commands/update-attack-roll.command.js';
import { PrepareAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import { UpdateAttackRollHandler } from '../../../../src/modules/actions/application/cqrs/handlers/update-attack-roll.handler.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { ActionResolution } from '../../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { sheetsOf } from '../../support/actor-sheets.js';
import { type CombatPluginContextOptions, createCombatPluginContext } from '../combat/combat-plugin-test.factory.js';
import { fakeCriticalLocationPort } from '../../../fixtures/critical-locations.js';

// Workspace spec 076, decisions B1-B3 (plan §2.1-§2.2). Invented data only.

const processor = () => new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));

/** A melee attack of `attacker-1` forced as a reaction of the talent, with the OB used in parries given. */
const reactionContext = (options: CombatPluginContextOptions & { traitId?: string; obOverride?: number | null; parries?: number[] }) => {
  const ctx = createCombatPluginContext({ skillId: 'melee-weapon@blade', ...options });
  ctx.action.resolution = ActionResolution.forced('reaction');
  ctx.action.reaction = {
    traitId: options.traitId ?? 'opportunistic-strike',
    triggerActionId: 'trigger-1',
    obOverride: options.obOverride ?? null,
    alertId: 'alert-1',
  };
  ctx.action.actionPoints = 0;
  ctx.sourceActor!.parries = options.parries ?? [];
  // The OB left once the parries are taken off, as the actor round computes it
  ctx.sourceAttack!.currentBo -= (options.parries ?? []).reduce((sum, parry) => sum + parry, 0);
  return ctx;
};

const prepare = async (ctx: ReturnType<typeof reactionContext>, bo: number) => {
  const handler = new PrepareAttackHandler(
    {
      findById: vi.fn(() =>
        Promise.resolve({
          id: 'game-1',
          round: 1,
          strategicGameId: 'sg-1',
          checkValidActionManagement: () => undefined,
          getActionPhase: () => 2,
        }),
      ),
    } as unknown as GameRepository,
    { findByGameAndRoundAndActors: vi.fn(() => Promise.resolve(ctx.actors)) } as unknown as ActorRoundRepository,
    {
      findById: vi.fn(() => Promise.resolve(ctx.action)),
      findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
      update: vi.fn((updated: Action) => Promise.resolve(updated)),
    } as unknown as ActionRepository,
    sheetsOf({ findById: vi.fn(() => Promise.resolve({ skills: [], traits: [] })) } as unknown as CharacterPort),
    { findById: vi.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient,
    { publish: vi.fn(() => Promise.resolve()) },
    processor(),
  );
  const prepared = await handler.execute(
    new PrepareAttackCommand(
      ctx.action.id,
      [{ attackName: 'Longsword', modifiers: { targetId: 'defender-1', bo } as PrepareAttackCommandModifiers, protectors: null }],
      'user',
      [],
    ),
  );
  const attack = prepared.attacks![0];
  return { attack, modifiers: Object.fromEntries(attack.calculated!.rollModifiers.map(modifier => [modifier.key, modifier.value])) };
};

describe('Preparing a reaction attack (spec 076, decision B1)', () => {
  const opportunist = [new ActorRoundTrait('opportunistic-strike', 1, 'blade')];

  it('is not limited by the OB given to parries, and takes no AP penalty', async () => {
    const ctx = reactionContext({ sourceTraits: opportunist, parries: [30] });
    const { attack, modifiers } = await prepare(ctx, 75);
    expect(modifiers.bo).toBe(75);
    expect(modifiers['action-points'] ?? 0).toBe(0);
    expect(attack.reaction).toEqual({ traitId: 'opportunistic-strike', triggerActionId: 'trigger-1', obOverride: null });
  });

  it('a riposte attacks with its fixed OB whatever the OB declared', async () => {
    const ctx = reactionContext({
      sourceTraits: [new ActorRoundTrait('riposte', 1, 'melee-weapon@blade')],
      traitId: 'riposte',
      obOverride: -20,
    });
    const { modifiers } = await prepare(ctx, 200);
    expect(modifiers.bo).toBe(-20);
  });

  it('rejects a weapon the talent was not taken for', async () => {
    const ctx = reactionContext({ sourceTraits: [new ActorRoundTrait('opportunistic-strike', 1, 'hafted')] });
    await expect(prepare(ctx, 50)).rejects.toMatchObject({ code: 'err-reaction-weapon-mismatch' });
  });
});

describe('Opportunistic Strike alert on a fumble (spec 076, decision B3)', () => {
  it('raises the alert on the target when the melee attack fumbles, once', async () => {
    const ctx = createCombatPluginContext({
      fumble: 5,
      targetTraits: [new ActorRoundTrait('opportunistic-strike', 1, 'blade')],
      targetAttacks: [createCombatPluginContext({ skillId: 'melee-weapon@blade' }).sourceAttack!],
    });
    ctx.attack!.calculated = new ActionAttackCalculated([], 60, undefined, undefined, [], undefined, 5);
    const target = ctx.targetActor!;
    target.alerts = [];
    ctx.sourceActor!.injuries = [];
    const actorRoundUpdate = vi.fn(() => Promise.resolve());
    const handler = new UpdateAttackRollHandler(
      {
        findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, phase: 'phase_2', checkNotFinished: () => undefined })),
      } as unknown as GameRepository,
      {
        findById: vi.fn(() => Promise.resolve(ctx.action)),
        update: vi.fn((updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      {
        findByActorIdAndRound: vi.fn((_g: string, actorId: string) =>
          Promise.resolve(ctx.actors!.find(actor => actor.actorId === actorId)),
        ),
        update: actorRoundUpdate,
      } as unknown as ActorRoundRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      new CombatAttackRollResolverService(
        processor(),
        {
          lookup: vi.fn(() => Promise.resolve(new AttackTableEntry('0', 0, undefined, undefined))),
        },
        fakeCriticalLocationPort(),
      ),
    );

    await handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', 3, 'user', [], 3));
    // A repeated roll does not raise it again
    await handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', 3, 'user', [], 3));
    expect(ctx.attack!.results?.fumble).toBeDefined();
    expect(target.alerts).toEqual([
      expect.objectContaining({
        type: 'reaction-available',
        reaction: {
          traitId: 'opportunistic-strike',
          triggerActionId: 'action-1',
          targetActorId: 'attacker-1',
          obOverride: null,
          round: 1,
          phase: 'phase_2',
        },
      }),
    ]);
    expect(actorRoundUpdate).toHaveBeenCalledWith(target);
  });
});
