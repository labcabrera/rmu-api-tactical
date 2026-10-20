import { describe, expect, it } from '@jest/globals';
import type { ManeuverPort } from '../../../../src/modules/actions/application/ports/maneuver.port';
import { MovementProcessorService } from '../../../../src/modules/actions/application/services/movement-processor.service';
import type { SkillService } from '../../../../src/modules/actions/application/services/skill-service';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';

const service = new MovementProcessorService({} as ManeuverPort, {} as SkillService);

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
