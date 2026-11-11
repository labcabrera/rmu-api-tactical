import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { GetManeuverModifiersHandler } from '../../../../src/modules/actions/application/cqrs/handlers/get-maneuver-modifiers.handler.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { GetManeuverModifiersQuery } from '../../../../src/modules/actions/application/cqrs/queries/get-maneuver-modifiers.query.js';
import type { FogLevel } from '../../../../src/modules/actions/domain/value-objects/fog-level.vo.js';
import type { LightType } from '../../../../src/modules/actions/domain/value-objects/light-type.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { GameEnvironment } from '../../../../src/modules/games/domain/value-objects/game-environment.vo.js';
import type { SenseChoices } from '../../../../src/modules/shared/domain/senses/sense-modifiers.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

// Workspace spec 079, C5 (§15.7, Table 15-7): the fog of the game in Perception and Tracking.

interface FogSetup extends ManeuverSetup {
  traits?: ActorRoundTrait[];
  fog?: FogLevel | null;
}

const prepare = (options: FogSetup) => {
  const { traits = [], fog = null, ...setupOptions } = options;
  const setup = setupManeuver({
    skillId: 'perception',
    freeAction: true,
    ...setupOptions,
    actorRound: actorRound => {
      actorRound.traits = traits;
    },
  });
  (setup.game as { environment?: GameEnvironment }).environment = new GameEnvironment(undefined, undefined, undefined, fog);
  return setup;
};

const resolve = async (options: FogSetup, req: { light?: LightType; senses?: SenseChoices } = {}) => {
  const setup = prepare(options);
  const handler = new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );
  const request = Object.assign(new ResolveManeuverRequest('m', {}), req);
  const result = await handler.execute(new ResolveManeuverCommand('action-1', request, new ManeuverRoll(50), 'user-1', []));
  return { modifiers: breakdown(result.maneuver!.roll!.modifiers), roll: result.maneuver!.roll! };
};

const list = async (options: FogSetup) => {
  const setup = prepare(options);
  const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
  return handler.execute(new GetManeuverModifiersQuery('action-1', undefined, undefined, 'user-1', []));
};

describe('Fog in Perception and Tracking (workspace spec 079, C5)', () => {
  it('visual Perception in heavy fog takes -50, a line of its own with its rule', async () => {
    const { modifiers, roll } = await resolve({ fog: 'heavy' });
    expect(modifiers.fog).toBe(-50);
    expect(roll.modifiers.find(modifier => modifier.key === 'fog')).toMatchObject({
      group: 'situation',
      rule: '§15.7',
      params: { fog: 'heavy', visibilityFeet: 50 },
    });
  });

  it('the vision talents reduce the darkness, not the fog', async () => {
    const traits = [new ActorRoundTrait('nightvision', 1, null), new ActorRoundTrait('darkvision', 1, null)];
    const { modifiers } = await resolve({ fog: 'extreme', traits }, { light: 'dark', senses: { senseSelections: ['within-darkvision'] } });
    expect(modifiers.light).toBeUndefined();
    expect(modifiers.fog).toBe(-75);
  });

  it('hearing takes -20 only beyond the visual range; Tracking by smell takes nothing', async () => {
    const near = await resolve({ fog: 'light' }, { senses: { sense: 'hearing' } });
    expect(near.modifiers.fog).toBeUndefined();
    expect(near.modifiers['fog-beyond-visual-range']).toBeUndefined();
    const far = await resolve({ fog: 'light' }, { senses: { sense: 'hearing', senseSelections: ['beyond-visual-range'] } });
    expect(far.modifiers['fog-beyond-visual-range']).toBe(-20);
    const smell = await resolve({ skillId: 'tracking', fog: 'medium' }, { senses: { sense: 'smell' } });
    expect(smell.modifiers.fog).toBeUndefined();
    const tracking = await resolve({ skillId: 'tracking', fog: 'medium' });
    expect(tracking.modifiers.fog).toBe(-25);
  });

  it('the listing gives the fog and the selection beyond the visual range only with fog', async () => {
    const foggy = await list({ fog: 'medium' });
    expect(foggy.fog).toEqual({ level: 'medium', visibilityFeet: 100, vision: -25, hearingBeyondRange: -20 });
    expect(foggy.senses?.selections).toContain('beyond-visual-range');
    const clear = await list({});
    expect(clear.fog).toBeUndefined();
    expect(clear.senses?.selections).not.toContain('beyond-visual-range');
    const lore = await list({ skillId: 'old-lore', fog: 'heavy' });
    expect(lore.fog).toBeUndefined();
  });
});
