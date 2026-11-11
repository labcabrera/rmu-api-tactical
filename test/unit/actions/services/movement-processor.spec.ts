import { describe, expect, it, vi } from 'vitest';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { ManeuverPort, PercentManeuverResponse } from '../../../../src/modules/actions/application/ports/maneuver.port.js';
import { MovementProcessorService } from '../../../../src/modules/actions/application/services/movement-processor.service.js';
import { ManeuverBaseModifiersService } from '../../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service.js';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { sheetsOf } from '../../support/actor-sheets.js';

const service = new MovementProcessorService({} as ManeuverPort, sheetsOf({} as CharacterPort), new ManeuverBaseModifiersService());

const move = (
  pace: string,
  maxPace: string | undefined,
  actionPoints = 4,
  halfMovement = false,
  concentrating = false,
  options: { free?: boolean; backwards?: boolean; prone?: boolean } = {},
) => {
  const action = {
    actionPoints,
    freeAction: options.free ?? false,
    movement: { modifiers: { pace, requiredManeuver: false, backwards: options.backwards } },
  } as unknown as Action;
  const actorRound = {
    movement: { bmr: 20, penalty: 0, maxPace, baseDifficulty: 'm' },
    hasHalfMovement: () => halfMovement,
    hasEffect: (status: string) => status === 'prone' && options.prone === true,
    concentration: () => (concentrating ? [{ kind: 'partial-dodge' }] : []),
  } as unknown as ActorRound;
  return service.process(null, action, actorRound).then(() => action.movement!.calculated);
};

describe('MovementProcessorService', () => {
  it('a normal movement covers 1 BMR per AP, whatever its pace (workspace spec 081, decision 4)', async () => {
    expect(await move('walk', 'dash', 1)).toMatchObject({ paceMultiplier: null, distance: 20 });
    expect(await move('run', 'dash', 3)).toMatchObject({ paceMultiplier: null, distance: 60 });
  });

  it('a dash covers 1.25 × BMR per AP', async () => {
    expect(await move('dash', 'dash', 4)).toMatchObject({ paceMultiplier: 1.25, distance: 100 });
  });

  it('a free movement covers the share of its pace per phase (Table 5-3)', async () => {
    expect(await move('run', 'dash', 4, false, false, { free: true })).toMatchObject({ paceMultiplier: 0.75, distance: 60 });
    expect(await move('walk', 'dash', 1, false, false, { free: true })).toMatchObject({ paceMultiplier: 0.25, distance: 5 });
  });

  it("rejects a chosen pace above the actor's maximum pace, and leaves a normal movement to the limit of the round", async () => {
    await expect(move('dash', 'run')).rejects.toMatchObject({ code: 'err-pace-above-max' });
    await expect(move('jog', 'walk', 1, false, false, { free: true })).rejects.toMatchObject({ code: 'err-pace-above-max' });
    await expect(move('sprint', 'walk', 4)).resolves.toMatchObject({ distance: 80 });
  });

  it('does not check the pace when the maximum is not known', async () => {
    await expect(move('dash', undefined)).resolves.toMatchObject({ distance: 100 });
  });

  it('halves the BMR once moving backwards or prone (decision 10)', async () => {
    await expect(move('walk', 'dash', 1, false, false, { backwards: true })).resolves.toMatchObject({
      bmr: 10,
      distance: 10,
      bmrMultipliers: [{ key: 'backwards', value: 0.5 }],
    });
    await expect(move('walk', 'dash', 1, false, false, { prone: true })).resolves.toMatchObject({
      bmr: 10,
      bmrMultipliers: [{ key: 'prone', value: 0.5 }],
    });
    await expect(move('walk', 'dash', 1, false, false, { backwards: true, prone: true })).resolves.toMatchObject({ bmr: 10 });
  });
});

describe('MovementProcessorService movement roll', () => {
  const roll = async (
    skills: Array<{ skillId: string; specialization: string | null; totalBonus: number }>,
    light?: string,
    traits: ActorRoundTrait[] = [],
  ) => {
    const percent = vi.fn<(total: number) => Promise<PercentManeuverResponse>>(() =>
      Promise.resolve({ percent: 100, critical: null, message: 'Completed at 100%' }),
    );
    const characterClient = {
      findById: () =>
        Promise.resolve({
          id: 'actor-1',
          skills,
          equipment: { maneuverPenalty: -15, encumbrancePenalty: -5, slots: {}, movementBaseDifficulty: 'm' },
        }),
    } as unknown as CharacterPort;
    const processor = new MovementProcessorService(
      { percent } as unknown as ManeuverPort,
      sheetsOf(characterClient),
      new ManeuverBaseModifiersService(),
    );
    const action = {
      actionPoints: 2,
      movement: { modifiers: { pace: 'jog', requiredManeuver: true, skillId: 'running', difficulty: 'h', customBonus: 0, light } },
    } as unknown as Action;
    const actorRound = load({ penalties: [['critical', -10]] });
    actorRound.traits = traits;
    await processor.process(30, action, actorRound);
    return { modifiers: Object.fromEntries(action.movement!.roll!.modifiers.map(m => [m.key, m.value])), percent, action };
  };

  it('takes the base modifiers without the pace penalty, and -25 when unskilled (M7)', async () => {
    const { modifiers, percent } = await roll([]);
    expect(modifiers).toEqual({
      unskilled: -25,
      difficulty: -10,
      'penalty-injury': -10,
      'armor-maneuver': -15,
      encumbrance: -5,
      'custom-bonus': 0,
      roll: 30,
    });
    expect(percent).toHaveBeenCalledWith(-35);
  });

  it('uses the skill bonus of the sheet', async () => {
    const { modifiers } = await roll([{ skillId: 'running', specialization: null, totalBonus: 45 }]);
    expect(modifiers.running).toBe(45);
  });

  it('applies the light of the environment as helpful (Table 5-1)', async () => {
    const { modifiers } = await roll([], 'dark');
    expect(modifiers.light).toBe(-25);
    const { modifiers: lit } = await roll([], 'no_shadows');
    expect(lit.light).toBeUndefined();
  });

  it('workspace spec 076: Nightvision uses its column and Light Sensitivity penalizes the bright light', async () => {
    const { modifiers } = await roll([], 'dark', [new ActorRoundTrait('nightvision', 1, null)]);
    expect(modifiers.light).toBe(-5);
    const { modifiers: sun } = await roll([], 'no_shadows', [new ActorRoundTrait('light-sensitivity', 1, null)]);
    expect(sun['light-sensitivity']).toBe(-25);
  });

  it('halves the movement rate of an actor with half movement (spec 034)', async () => {
    await expect(move('run', 'dash', 4, true)).resolves.toMatchObject({ bmr: 10, distance: 40 });
  });

  it('halves the BMR again while concentrating (workspace spec 077, decision A2.3)', async () => {
    await expect(move('run', 'dash', 4, true, true)).resolves.toMatchObject({
      bmr: 5,
      distance: 20,
      bmrMultipliers: [
        { key: 'half-movement', value: 0.5 },
        { key: 'concentration', value: 0.5 },
      ],
    });
  });
});
