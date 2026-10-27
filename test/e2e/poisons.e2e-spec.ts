import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Injury = { id: string; type: string; penalty: number; poison?: { elapsedRounds: number; finished?: boolean; neutralized?: boolean } };
type ActorRoundBody = { id: string; actorId: string; hp: { current: number }; injuries: Injury[]; poisonExposures: { id: string }[] };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

// Made-up poison: the suite's poison tables have one muscle row per severity, each starting a round later.
const POISON = { name: 'Test venom', category: 'muscle', level: 5, immediateHits: { min: 3, max: 3 } };

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('bilbo', character('bilbo', { resistances: [{ resistance: 'poison', totalBonus: 10 }] }));
});

afterAll(async () => {
  await e2e?.stop();
});

const startedGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Mirkwood',
    factions: ['faction-1'],
    actors: [{ id: 'bilbo', type: 'character' }],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return { gameId, round: (page.body as { content: ActorRoundBody[] }).content[0] };
};

const nextRound = async (gameId: string, round: number): Promise<ActorRoundBody> => {
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  for (let i = 0; i < 5; i++) {
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  }
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==${round}`);
  return (page.body as { content: ActorRoundBody[] }).content[0];
};

describe('poisonings (workspace spec 042)', () => {
  it('exposes, resolves the poison RR, advances the stages and neutralizes with an antidote', async () => {
    const { gameId, round } = await startedGame();
    const exposed = await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings`, { poison: POISON });
    expect(exposed.status).toBe(201);
    const exposureId = (exposed.body as { exposure: { id: string } }).exposure.id;
    expect((exposed.body as { actorRound: ActorRoundBody }).actorRound.poisonExposures).toHaveLength(1);

    // 30 + 10 - 3 x 5 = 25 against 60: failure 35, moderate.
    const resolved = await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings/${exposureId}/resolve`, { roll: 30 });
    expect(resolved.status).toBe(200);
    const body = resolved.body as { actorRound: ActorRoundBody; rr: Record<string, unknown>; injuryId: string };
    expect(body.rr).toMatchObject({ bonus: 10, attackLevel: 5, total: 25, resisted: false, failure: 35, severity: 'moderate' });
    expect(body.actorRound.poisonExposures).toHaveLength(0);
    expect(body.actorRound.hp.current).toBe(47);
    const injury = body.actorRound.injuries.find(each => each.id === body.injuryId);
    expect(injury).toMatchObject({ type: 'poison-disease', penalty: -5, poison: { elapsedRounds: 0 } });

    const round2 = await nextRound(gameId, 2);
    expect(round2.injuries.find(each => each.id === body.injuryId)).toMatchObject({ penalty: -15, poison: { elapsedRounds: 1 } });

    const antidote = await as('owner').post(`/v1/actor-rounds/${round2.id}/injuries/${body.injuryId}/antidote`, {
      source: 'item',
      name: 'Test cure',
      categories: ['muscle'],
      level: 5,
    });
    expect(antidote.status).toBe(200);
    expect(antidote.body).toMatchObject({ injuryId: body.injuryId, neutralized: true });
    const cured = (antidote.body as { actorRound: ActorRoundBody }).actorRound.injuries.find(each => each.id === body.injuryId);
    expect(cured).toMatchObject({ penalty: 0, poison: { neutralized: true, finished: true } });
  });

  it('validates the poison, the exposure and the injury', async () => {
    const { round } = await startedGame();
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings`, { poison: { ...POISON, category: 'acid' } })).status).toBe(
      400,
    );
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings/missing/resolve`, { roll: 50 })).status).toBe(404);
    expect(
      (await as('owner').post(`/v1/actor-rounds/${round.id}/injuries/missing/antidote`, { source: 'magic', name: 'Cure' })).status,
    ).toBe(404);
    const exposed = await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings`, { poison: POISON });
    const exposureId = (exposed.body as { exposure: { id: string } }).exposure.id;
    expect((await as('other').delete(`/v1/actor-rounds/${round.id}/poisonings/${exposureId}`)).status).toBe(403);
    const dismissed = await as('owner').delete(`/v1/actor-rounds/${round.id}/poisonings/${exposureId}`);
    expect(dismissed.status).toBe(200);
    expect((dismissed.body as ActorRoundBody).poisonExposures).toHaveLength(0);
  });

  it('a resisted RR leaves no injury', async () => {
    const { round } = await startedGame();
    const exposed = await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings`, { poison: POISON });
    const exposureId = (exposed.body as { exposure: { id: string } }).exposure.id;
    const resolved = await as('owner').post(`/v1/actor-rounds/${round.id}/poisonings/${exposureId}/resolve`, {
      roll: 60,
      modifiers: [{ key: 'half-dose', value: 50 }],
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ rr: { resisted: true } });
    expect((resolved.body as { injuryId?: string }).injuryId).toBeUndefined();
    expect((resolved.body as { actorRound: ActorRoundBody }).actorRound.injuries).toHaveLength(0);
  });
});
