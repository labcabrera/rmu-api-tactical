import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import type { FrenzyPurpose } from '../../../../src/modules/actions/domain/value-objects/frenzy-purpose.vo.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { UnprocessableEntityError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

const handlerFor = (setup: ReturnType<typeof setupManeuver>) =>
  new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );

const withTraits =
  (traitIds: string[], prepare?: (actorRound: ActorRound) => void): ManeuverSetup['actorRound'] =>
  actorRound => {
    actorRound.traits = traitIds.map(traitId => new ActorRoundTrait(traitId, 1, null));
    prepare?.(actorRound);
  };

const resolve = async (purpose: FrenzyPurpose, options: ManeuverSetup = {}) => {
  const setup = setupManeuver({ skillId: 'adrenal-focus', actorRound: withTraits(['frenzy']), ...options });
  const req = Object.assign(new ResolveManeuverRequest('h', {}), { purpose });
  const result = await handlerFor(setup).execute(new ResolveManeuverCommand('action-1', req, new ManeuverRoll(80), 'user-1', []));
  return { setup, result, modifiers: breakdown(result.maneuver!.roll!.modifiers) };
};

describe('Frenzy maneuver (spec 040, decisions 8-9)', () => {
  it('enters the frenzy on a success and stores the purpose', async () => {
    const { setup, result } = await resolve('frenzy-enter');
    expect(setup.actorRound.frenzyLevel()).toBe(1);
    expect(result.maneuver!.modifiers.purpose).toBe('frenzy-enter');
    expect(setup.actorRoundUpdate).toHaveBeenCalled();
  });

  it('does not enter the frenzy on a failure', async () => {
    const { setup } = await resolve('frenzy-enter', { absolute: { result: 'partial-success', message: 'No', effects: [] } });
    expect(setup.actorRound.frenzyLevel()).toBe(0);
    expect(setup.actorRoundUpdate).not.toHaveBeenCalled();
  });

  it('enters the greater frenzy at -30 with the Greater Frenzy talent', async () => {
    const { setup, modifiers } = await resolve('frenzy-enter-greater', { actorRound: withTraits(['frenzy-greater']) });
    expect(modifiers['frenzy-greater']).toBe(-30);
    expect(setup.actorRound.frenzyLevel()).toBe(2);
  });

  it('leaves the frenzy, at -30 from a greater one, with +10 of Improved Frenzy', async () => {
    const { setup, modifiers } = await resolve('frenzy-exit', {
      actorRound: withTraits(['frenzy-greater'], actorRound => {
        actorRound.enterFrenzy(2);
        actorRound.activeStyle = {
          skillId: 'battle-styles',
          styleId: 'berserker',
          met: true,
          attackNames: null,
          freeRanksBonus: 0,
          abilities: [{ abilityId: 'improved-frenzy', times: 1, met: true, attackNames: null }],
          warnings: [],
          options: [],
        };
      }),
    });
    expect(modifiers).toMatchObject({ 'frenzy-greater': -30, 'improved-frenzy': 10 });
    expect(setup.actorRound.frenzyLevel()).toBe(0);
  });

  it('rejects an actor without the talent, another skill and leaving without a frenzy', async () => {
    await expect(resolve('frenzy-enter', { actorRound: withTraits([]) })).rejects.toThrow(UnprocessableEntityError);
    await expect(resolve('frenzy-enter-greater')).rejects.toThrow(UnprocessableEntityError);
    await expect(resolve('frenzy-enter', { skillId: 'old-lore' })).rejects.toThrow(UnprocessableEntityError);
    await expect(resolve('frenzy-exit')).rejects.toThrow(UnprocessableEntityError);
  });
});
