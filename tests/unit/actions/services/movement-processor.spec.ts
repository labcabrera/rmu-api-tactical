import { describe, expect, it, jest } from '@jest/globals';
import type { ManeuverPort, PercentManeuverResponse } from '../../../../src/modules/actions/application/ports/maneuver.port';
import { MovementProcessorService } from '../../../../src/modules/actions/application/services/movement-processor.service';
import { ManeuverBaseModifiersService } from '../../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port';
import { load } from '../../actor-rounds/actor-round-test.factory';

const service = new MovementProcessorService({} as ManeuverPort, {} as CharacterPort, new ManeuverBaseModifiersService());

const move = (pace: string, maxPace: string | undefined, actionPoints = 4) => {
  const action = { actionPoints, movement: { modifiers: { pace, requiredManeuver: false } } } as unknown as Action;
  const actorRound = { movement: { bmr: 20, penalty: 0, maxPace, baseDifficulty: 'm' } } as unknown as ActorRound;
  return service.process(null, action, actorRound).then(() => action.movement!.calculated);
};

describe('MovementProcessorService', () => {
  it('moves 1.25 × BMR per phase at dash pace (Table 5-3)', async () => {
    expect(await move('dash', 'dash')).toMatchObject({ paceMultiplier: 1.25, distance: 100 });
    expect(await move('sprint', 'dash')).toMatchObject({ paceMultiplier: 1, distance: 80 });
  });

  it("rejects a pace above the actor's maximum pace", async () => {
    await expect(move('dash', 'run')).rejects.toMatchObject({ errorCode: 'err-pace-above-max' });
    await expect(move('run', 'run')).resolves.toMatchObject({ distance: 60 });
  });

  it('does not check the pace when the maximum is not known', async () => {
    await expect(move('dash', undefined)).resolves.toMatchObject({ distance: 100 });
  });
});

describe('MovementProcessorService movement roll', () => {
  const roll = async (skills: Array<{ skillId: string; specialization: string | null; totalBonus: number }>, light?: string) => {
    const percent = jest.fn<(total: number) => Promise<PercentManeuverResponse>>(() =>
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
      characterClient,
      new ManeuverBaseModifiersService(),
    );
    const action = {
      actionPoints: 2,
      movement: { modifiers: { pace: 'jog', requiredManeuver: true, skillId: 'running', difficulty: 'h', customBonus: 0, light } },
    } as unknown as Action;
    const actorRound = load({ penalties: [['critical', -10]] });
    await processor.process(30, action, actorRound);
    return { modifiers: Object.fromEntries(action.movement!.roll!.modifiers.map(m => [m.key, m.value])), percent, action };
  };

  it('takes the base modifiers without the pace penalty, and -25 when unskilled (M7)', async () => {
    const { modifiers, percent } = await roll([]);
    expect(modifiers).toEqual({
      running: -25,
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
});
