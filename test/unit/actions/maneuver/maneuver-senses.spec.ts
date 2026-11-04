import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { GetManeuverModifiersHandler } from '../../../../src/modules/actions/application/cqrs/handlers/get-maneuver-modifiers.handler.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { GetManeuverModifiersQuery } from '../../../../src/modules/actions/application/cqrs/queries/get-maneuver-modifiers.query.js';
import type { LightType } from '../../../../src/modules/actions/domain/value-objects/light-type.vo.js';
import { ManeuverModifiersDto } from '../../../../src/modules/actions/interfaces/http/dto/maneuver-modifiers.dto.js';
import { ResolveManeuverDto } from '../../../../src/modules/actions/interfaces/http/dto/resolve-maneuver.dto.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { GameEnvironment } from '../../../../src/modules/games/domain/value-objects/game-environment.vo.js';
import type { SenseChoices } from '../../../../src/modules/shared/domain/senses/sense-modifiers.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

/*
 * Workspace spec 076, block C: senses and light of Perception and Tracking. The test skills have no light in their
 * profile, as Perception in core today: the light comes from the sense rules of tactical.
 */

interface SenseSetup extends ManeuverSetup {
  traits?: ActorRoundTrait[];
  ambientLight?: LightType | null;
}

const prepare = (options: SenseSetup) => {
  const { traits = [], ambientLight, ...setupOptions } = options;
  const setup = setupManeuver({
    skillId: 'perception',
    freeAction: true,
    ...setupOptions,
    actorRound: actorRound => {
      actorRound.traits = traits;
    },
  });
  if (ambientLight !== undefined) {
    (setup.game as { environment?: GameEnvironment }).environment = new GameEnvironment(undefined, undefined, ambientLight);
  }
  return setup;
};

const resolve = async (options: SenseSetup, req: { light?: LightType; senses?: SenseChoices } = {}) => {
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
  return { result, modifiers: breakdown(result.maneuver!.roll!.modifiers), roll: result.maneuver!.roll! };
};

const list = async (options: SenseSetup) => {
  const setup = prepare(options);
  const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
  return handler.execute(new GetManeuverModifiersQuery('action-1', undefined, undefined, 'user-1', []));
};

const trait = (traitId: string, tier = 1) => new ActorRoundTrait(traitId, tier, null);

describe('Perception and Tracking senses (workspace spec 076, block C)', () => {
  it('auditory Perception takes no light, and the hearing talents', async () => {
    const { modifiers, roll } = await resolve(
      { traits: [trait('acute-hearing', 2), trait('sight-eagle')] },
      { light: 'dark', senses: { sense: 'hearing' } },
    );
    expect(modifiers.light).toBeUndefined();
    expect(modifiers['acute-hearing']).toBe(10);
    expect(modifiers['sight-eagle']).toBeUndefined();
    expect(roll.skipped).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'light', reason: 'light-not-needed' })]));
    const acute = roll.modifiers.find(modifier => modifier.key === 'acute-hearing')!;
    expect(acute).toMatchObject({ group: 'senses', rule: '§4.6', params: { tier: 2, sense: 'hearing' } });
  });

  it('visual Perception at night: the light is required, and Nightvision uses its column', async () => {
    const without = await resolve({}, { light: 'dark' });
    expect(without.modifiers.light).toBe(-50);
    expect(without.result.maneuver!.modifiers.lightModifier).toBe('required');
    const nightvision = await resolve({ traits: [trait('nightvision')] }, { light: 'dark' });
    expect(nightvision.modifiers.light).toBe(-10);
    expect(nightvision.roll.modifiers.find(modifier => modifier.key === 'light')!.params).toMatchObject({ nightvision: true });
  });

  it('Tracking with vision: the light helps', async () => {
    const { modifiers } = await resolve({ skillId: 'tracking' }, { light: 'dark' });
    expect(modifiers.light).toBe(-25);
    const smell = await resolve({ skillId: 'tracking' }, { light: 'dark', senses: { sense: 'smell' } });
    expect(smell.modifiers.light).toBeUndefined();
  });

  it('Darkvision sees in pitch black within its range, not beyond it', async () => {
    const traits = [trait('nightvision'), trait('darkvision', 2)];
    const within = await resolve({ traits }, { light: 'pitch_black', senses: { senseSelections: ['within-darkvision'] } });
    expect(within.modifiers.light).toBeUndefined();
    const beyond = await resolve({ traits }, { light: 'pitch_black' });
    expect(beyond.modifiers.light).toBe(-100);
  });

  it('Light Sensitivity II in bright light, in the senses group', async () => {
    const { modifiers, roll } = await resolve({ traits: [trait('light-sensitivity', 2)] }, { light: 'no_shadows' });
    expect(modifiers['light-sensitivity']).toBe(-50);
    expect(roll.modifiers.find(modifier => modifier.key === 'light-sensitivity')).toMatchObject({ group: 'senses', rule: '§4.5' });
    const shade = await resolve({ traits: [trait('light-sensitivity', 2)] }, { light: 'light_shadows' });
    expect(shade.modifiers['light-sensitivity']).toBe(-25);
  });

  it('the ambient light of the game is the default, and the light of the request wins', async () => {
    const ambient = await resolve({ ambientLight: 'extremely_dark' });
    expect(ambient.modifiers.light).toBe(-70);
    expect(ambient.result.maneuver!.modifiers.light).toBe('extremely_dark');
    const override = await resolve({ ambientLight: 'extremely_dark' }, { light: 'medium_shadows' });
    expect(override.modifiers.light).toBe(-20);
    // A skill without light ignores the ambient light, without a rule not applied
    const lore = await resolve({ skillId: 'old-lore', ambientLight: 'dark' });
    expect(lore.modifiers.light).toBeUndefined();
    expect((lore.roll.skipped ?? []).some(rule => rule.source === 'light')).toBe(false);
  });

  it('Missing Sense, Heatsense and Tetrachromatic Vision through the request', async () => {
    const { modifiers } = await resolve(
      { traits: [trait('missing-sense-hearing'), trait('heatsense'), trait('tetrachromatic-vision')] },
      {
        senses: {
          sense: 'hearing',
          senseUsage: 'helpful',
          missingSenseModifier: -35,
          heatsenseModifier: 15,
          senseSelections: ['warm-target'],
        },
      },
    );
    expect(modifiers['missing-sense-hearing']).toBe(-35);
    expect(modifiers.heatsense).toBe(15);
    expect(modifiers['tetrachromatic-vision']).toBeUndefined();
  });

  it('rejects a sense for other skills, and the extra sense without Extra Sense', async () => {
    await expect(resolve({ skillId: 'old-lore' }, { senses: { sense: 'hearing' } })).rejects.toMatchObject({
      code: 'err-maneuver-sense-not-allowed',
    });
    await expect(resolve({}, { senses: { sense: 'extra' } })).rejects.toMatchObject({ code: 'err-maneuver-sense-missing-trait' });
    const extra = await resolve({ traits: [trait('extra-sense', 2)] }, { light: 'dark', senses: { sense: 'extra' } });
    expect(extra.modifiers.light).toBeUndefined();
  });

  it('the request DTO carries the sense fields', () => {
    const dto = Object.assign(new ResolveManeuverDto(), {
      roll: { roll: 50 },
      sense: 'hearing',
      senseUsage: 'helpful',
      senseSelections: ['locate-sound'],
      missingSenseModifier: -30,
    });
    const command = ResolveManeuverDto.toCommand('action-1', dto, 'user-1', []);
    expect(command.request.senses).toEqual({
      sense: 'hearing',
      senseUsage: 'helpful',
      senseSelections: ['locate-sound'],
      missingSenseModifier: -30,
      heatsenseModifier: undefined,
    });
    expect(
      ResolveManeuverDto.toCommand('action-1', Object.assign(new ResolveManeuverDto(), { roll: { roll: 1 } }), 'u', []).request.senses,
    ).toBe(undefined);
  });

  it('lists the senses, the ambient light and the light with the talents of the actor', async () => {
    const listing = await list({
      traits: [trait('nightvision'), trait('light-sensitivity', 1), trait('hearing-cat'), trait('extra-sense', 3)],
      ambientLight: 'dark',
    });
    expect(listing.defaultLight).toBe('dark');
    expect(listing.light!.usage).toBe('required');
    expect(listing.light!.options).toEqual(
      expect.arrayContaining([
        { key: 'no_shadows', value: 0, sensitivity: -25 },
        { key: 'dark', value: -10 },
      ]),
    );
    expect(listing.senses).toMatchObject({
      default: 'vision',
      options: ['vision', 'hearing', 'smell', 'taste', 'touch', 'extra'],
      defaultUsage: 'required',
      selections: ['locate-sound'],
      modifiers: [{ key: 'hearing-cat', value: 10, sense: 'hearing', selection: 'locate-sound', rule: '§4.5' }],
    });
    const dto = ManeuverModifiersDto.fromListing(listing);
    expect(dto.defaultLight).toBe('dark');
    expect(dto.senses!.modifiers[0].key).toBe('hearing-cat');
    const lore = await list({ skillId: 'old-lore' });
    expect(lore.senses).toBeUndefined();
    expect(lore.defaultLight).toBeNull();
  });
});
