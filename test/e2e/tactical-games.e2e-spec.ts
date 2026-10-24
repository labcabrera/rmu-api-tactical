import request from 'supertest';
import { character, ids, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type GameBody = {
  id: string;
  version: number;
  strategicGameId: string;
  name: string;
  status: string;
  round: number;
  phase: string;
  factions: string[];
  actors: { id: string; name: string; type: string; faction: { id: string } }[];
  environment?: { temperatureFatigueModifier?: number; altitudeFatigueModifier?: number };
  description?: string;
  imageUrl?: string;
  owner: string;
  strategicGameOwner?: string;
  accessType: string;
  outcome?: { appliedAt?: string; characters: { characterId: string; appliedAt?: string }[] };
};

type PageBody = { content: GameBody[]; pagination: { page: number; size: number; totalElements: number; totalPages: number } };

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.strategicGames.set('sg-public', { id: 'sg-public', owner: USERS.owner.sub, options: null, accessType: 'public' });
  e2e.world.strategicGames.set('sg-other', { id: 'sg-other', owner: USERS.other.sub, options: null, accessType: 'private' });
  e2e.world.characters.set('aragorn', character('aragorn'));
  e2e.world.characters.set('faramir', character('faramir', { owner: USERS.other.sub }));
  e2e.world.characters.set('boromir', character('boromir', { faction: { id: 'faction-2', name: 'Gondor' } }));
  e2e.world.npcs.set('orc-1', { id: 'orc-1', realmId: 'r-1', name: 'Orc' });
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string, body?: object) => {
    const req = request(e2e.server).delete(url).set('Authorization', e2e.auth(user));
    return body ? req.send(body) : req;
  },
});

const createGame = async (user: UserName = 'owner', body: object = {}) => {
  const response = await as(user).post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Moria',
    description: 'Bridge of Khazad-dum',
    factions: ['faction-1'],
    actors: [{ id: 'aragorn', type: 'character' }],
    ...body,
  });
  expect(response.status).toBe(201);
  return response.body as GameBody;
};

describe('authentication', () => {
  it('rejects a request without a token', async () => {
    expect((await request(e2e.server).get('/v1/tactical-games')).status).toBe(401);
  });

  it('rejects a token signed with another key', async () => {
    expect((await request(e2e.server).get('/v1/tactical-games').set('Authorization', 'Bearer a.b.c')).status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = e2e.jwks.token({ ...USERS.owner, exp: Math.floor(Date.now() / 1000) - 60 });
    expect((await request(e2e.server).get('/v1/tactical-games').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('rejects a token of another issuer', async () => {
    const token = e2e.jwks.token({ ...USERS.owner, iss: 'http://evil/realms/rmu' });
    expect((await request(e2e.server).get('/v1/tactical-games').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
});

describe('create', () => {
  it('creates a game with its characters, owned by the caller, and publishes it', async () => {
    const game = await createGame();

    expect(game).toMatchObject({
      strategicGameId: 'sg-1',
      name: 'Moria',
      description: 'Bridge of Khazad-dum',
      status: 'created',
      round: 0,
      phase: 'not_started',
      owner: USERS.owner.sub,
      actors: [{ id: 'aragorn', name: 'aragorn', type: 'character', faction: { id: 'faction-1' } }],
    });
    expect(game.factions).toEqual(['faction-1']);
    expect(e2e.world.events.some(e => e.aggregateType === 'game' && e.event.eventType === 'created')).toBe(true);
  });

  it('takes an NPC with the faction given in the request', async () => {
    const game = await createGame('owner', { actors: [{ id: 'orc-1', type: 'npc', faction: 'orcs' }] });
    expect(game.actors).toEqual([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a nested asymmetric matcher is typed any
      expect.objectContaining({ id: 'orc-1', name: 'Orc', type: 'npc', faction: expect.objectContaining({ id: 'orcs' }) }),
    ]);
  });

  it('answers 400 when the strategic game does not exist', async () => {
    const response = await as('owner').post('/v1/tactical-games', { strategicGameId: 'nope', name: 'x', description: 'x' });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'ValidationError', message: 'Strategic game nope not found' });
  });

  it('answers 400 when a character does not exist', async () => {
    const response = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'x',
      description: 'x',
      actors: [{ id: 'nobody', type: 'character' }],
    });
    expect(response.status).toBe(400);
  });

  it('validates the body', async () => {
    const response = await as('owner').post('/v1/tactical-games', { name: 7 });
    expect(response.status).toBe(400);
    expect(Array.isArray((response.body as { message: unknown }).message)).toBe(true);
  });

  // The description is optional, as in the model [F-tactical-12].
  it('creates a game without a description', async () => {
    const response = await as('owner').post('/v1/tactical-games', { strategicGameId: 'sg-1', name: 'x' });
    expect(response.status).toBe(201);
    expect((response.body as GameBody).description).toBeUndefined();
  });
});

describe('read and list', () => {
  let game: GameBody;

  beforeAll(async () => {
    game = await createGame('owner', { name: 'Listed' });
  });

  it('reads a game by id', async () => {
    const response = await as('owner').get(`/v1/tactical-games/${game.id}`);
    expect(response.status).toBe(200);
    expect((response.body as GameBody).name).toBe('Listed');
  });

  it('answers 404 for an unknown game', async () => {
    const response = await as('owner').get('/v1/tactical-games/00000000-0000-0000-0000-000000000000');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'NotFoundError' });
  });

  it('filters with RSQL and pages the result', async () => {
    const response = await as('owner').get(`/v1/tactical-games?q=name==Listed&page=0&size=10`);
    expect(response.status).toBe(200);
    const page = response.body as PageBody;
    expect(ids(page)).toEqual([game.id]);
    expect(page.pagination).toMatchObject({ page: 0, size: 10, totalElements: 1, totalPages: 1 });
  });

  it('sorts by the allowed fields', async () => {
    const response = await as('owner').get('/v1/tactical-games?sort=-createdAt&size=100');
    expect(response.status).toBe(200);
    expect((response.body as PageBody).content.length).toBeGreaterThan(1);
  });

  it('rejects an unknown sort', async () => {
    expect((await as('owner').get('/v1/tactical-games?sort=owner')).status).toBe(400);
  });

  it('rejects an invalid RSQL expression', async () => {
    expect((await as('owner').get('/v1/tactical-games?q=name===')).status).toBe(400);
  });

  // Pages go up to 100 games (spec 020) [F-tactical-13].
  it('limits the page size to 100', async () => {
    expect((await as('owner').get('/v1/tactical-games?size=100')).status).toBe(200);
    const response = await as('owner').get('/v1/tactical-games?size=101');
    expect(response.status).toBe(400);
    // The path goes without the query string (spec 021, F-receta-22).
    expect(response.body).toMatchObject({ statusCode: 400, code: 'bad-request', path: '/v1/tactical-games' });
  });
});

describe('update', () => {
  it('changes the name, the description and the image', async () => {
    const game = await createGame();
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, {
      name: 'Moria II',
      description: 'Second try',
      imageUrl: 'images/moria.png',
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Moria II', description: 'Second try', imageUrl: 'images/moria.png' });
    expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).body).toMatchObject({ name: 'Moria II' });
  });

  // A PATCH changes only what it sends: rmu-mfe-tactical sends only the image [F-tactical-12].
  it('changes only the fields it receives', async () => {
    const game = await createGame();
    const description = await as('owner').patch(`/v1/tactical-games/${game.id}`, { description: 'only this' });
    expect(description.status).toBe(200);
    expect(description.body).toMatchObject({ name: game.name, description: 'only this' });
    const image = await as('owner').patch(`/v1/tactical-games/${game.id}`, { imageUrl: 'images/other.png' });
    expect(image.status).toBe(200);
    expect(image.body).toMatchObject({ name: game.name, description: 'only this', imageUrl: 'images/other.png' });
  });

  it('validates the environment', async () => {
    const game = await createGame();
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, { environment: { temperatureFatigueModifier: 'cold' } });
    expect(response.status).toBe(400);
  });

  it('keeps the temperature and the altitude modifiers in place [F-tactical-14]', async () => {
    const game = await createGame();
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, {
      environment: { temperatureFatigueModifier: -10, altitudeFatigueModifier: -20 },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ environment: { temperatureFatigueModifier: -10, altitudeFatigueModifier: -20 } });
    expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).body).toMatchObject({
      environment: { temperatureFatigueModifier: -10, altitudeFatigueModifier: -20 },
    });
  });

  it('answers the version and moves it with each write', async () => {
    const game = await createGame();
    expect(game.version).toBe(0);
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, { name: 'v1', description: 'x', version: 0 });
    expect(response.status).toBe(200);
    expect((response.body as GameBody).version).toBe(1);
  });

  it('rejects a change made on a stale version with 409 version-conflict', async () => {
    const game = await createGame();
    await as('owner').patch(`/v1/tactical-games/${game.id}`, { name: 'first', description: 'x' });
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, { name: 'second', description: 'x', version: 0 });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'version-conflict' });
    expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).body).toMatchObject({ name: 'first', version: 1 });
  });

  // NotModifiedError went with spec 020: a PATCH that changes nothing is a 200 with the game, and no event.
  it('answers 200 without an event to a change that changes nothing', async () => {
    const game = await createGame();
    const before = e2e.world.events.length;
    const response = await as('owner').patch(`/v1/tactical-games/${game.id}`, { name: game.name, description: game.description });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: game.name });
    expect(e2e.world.events.slice(before).filter(e => e.aggregateType === 'game')).toEqual([]);
  });

  it('answers 404 for an unknown game', async () => {
    const response = await as('owner').patch('/v1/tactical-games/00000000-0000-0000-0000-000000000000', { name: 'x', description: 'x' });
    expect(response.status).toBe(404);
  });
});

describe('factions and actors', () => {
  it('adds and removes factions', async () => {
    const game = await createGame();
    const added = await as('owner').post(`/v1/tactical-games/${game.id}/factions`, { factions: ['Orcs'] });
    expect(added.status).toBe(200);
    expect((added.body as GameBody).factions).toEqual(['faction-1', 'Orcs']);

    const removed = await as('owner').delete(`/v1/tactical-games/${game.id}/factions`, { factions: ['Orcs'] });
    expect(removed.status).toBe(200);
    expect((removed.body as GameBody).factions).not.toContain('Orcs');
  });

  it('adds and removes actors', async () => {
    const game = await createGame();
    await as('owner').post(`/v1/tactical-games/${game.id}/factions`, { factions: ['faction-2'] });
    const added = await as('owner').post(`/v1/tactical-games/${game.id}/actors`, { actors: [{ id: 'boromir', type: 'character' }] });
    expect(added.status).toBe(200);
    expect((added.body as GameBody).actors.map(a => a.id)).toEqual(['aragorn', 'boromir']);

    const removed = await as('owner').delete(`/v1/tactical-games/${game.id}/actors`, { actors: ['boromir'] });
    expect(removed.status).toBe(200);
    expect((removed.body as GameBody).actors.map(a => a.id)).toEqual(['aragorn']);
  });
});

describe('lifecycle', () => {
  it('starts the round, goes through the phases and creates the actor rounds', async () => {
    const game = await createGame();
    const started = await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ status: 'in_progress', round: 1, phase: 'declare_initiative' });

    const actorRounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${game.id};round==1`);
    expect(actorRounds.status).toBe(200);
    expect((actorRounds.body as { content: { actorId: string }[] }).content.map(ar => ar.actorId)).toEqual(['aragorn']);

    const randomized = await as('owner').post(`/v1/tactical-games/${game.id}/initiatives/randomize`);
    expect(randomized.status).toBe(200);

    const phases: string[] = [];
    for (let i = 0; i < 5; i++) {
      const phase = await as('owner').post(`/v1/tactical-games/${game.id}/phases/start`);
      expect(phase.status).toBe(200);
      phases.push((phase.body as GameBody).phase);
    }
    expect(phases).toEqual(['phase_1', 'phase_2', 'phase_3', 'phase_4', 'upkeep']);

    const next = await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);
    expect(next.status).toBe(200);
    expect(next.body).toMatchObject({ round: 2, phase: 'declare_initiative' });
    const round2 = await as('owner').get(`/v1/actor-rounds?q=gameId==${game.id};round==2`);
    expect((round2.body as { content: unknown[] }).content).toHaveLength(1);
  });

  it('previews, finishes and applies the outcome to the strategic characters', async () => {
    const game = await createGame();
    await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);

    const preview = await as('owner').get(`/v1/tactical-games/${game.id}/finish-preview`);
    expect(preview.status).toBe(200);

    const finished = await as('owner').post(`/v1/tactical-games/${game.id}/finish`, { fates: [] });
    expect(finished.status).toBe(200);
    expect(finished.body).toMatchObject({ status: 'finished' });
    expect((finished.body as GameBody).outcome?.characters.map(c => c.characterId)).toEqual(['aragorn']);

    const applied = await as('owner').post(`/v1/tactical-games/${game.id}/apply`);
    expect(applied.status).toBe(200);
    expect((applied.body as GameBody).outcome?.appliedAt).toBeDefined();
    expect(e2e.world.outcomes.filter(o => o.request.tacticalGameId === game.id).map(o => o.characterId)).toEqual(['aragorn']);
  });

  it('rejects changes to a finished game', async () => {
    const game = await createGame();
    await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);
    await as('owner').post(`/v1/tactical-games/${game.id}/finish`, { fates: [] });

    const response = await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);
    expect(response.status).toBe(409);
    // The rule key goes in code, and in errorCode for the clients that read it before spec 020 (rmu-mfe-tactical).
    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'ConflictError',
      code: 'err-game-finished',
      errorCode: 'err-game-finished',
      path: `/v1/tactical-games/${game.id}/rounds/start`,
    });
  });

  it('rejects applying a game that is not finished', async () => {
    const game = await createGame();
    const response = await as('owner').post(`/v1/tactical-games/${game.id}/apply`);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});

describe('delete', () => {
  it('deletes the game with its actor rounds and actions, and publishes it', async () => {
    const game = await createGame();
    await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`);

    const response = await as('owner').delete(`/v1/tactical-games/${game.id}`);
    expect(response.status).toBe(204);
    expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).status).toBe(404);
    const actorRounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${game.id}`);
    expect((actorRounds.body as { content: unknown[] }).content).toEqual([]);
    expect(e2e.world.events.some(e => e.event.eventType === 'deleted' && (e.event.data as { id: string }).id === game.id)).toBe(true);
  });

  it('answers 404 for an unknown game', async () => {
    expect((await as('owner').delete('/v1/tactical-games/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });
});

// Spec 021, decision 2 [F-tactical-11]: the game is managed by its owner, the owner of its strategic game or an admin,
// and read as its strategic game says, also by the owners of its actors.
describe('permissions', () => {
  let game: GameBody;

  beforeEach(async () => {
    game = await createGame('owner');
  });

  const noToken = () => request(e2e.server);

  it('stores the owner and the accessType of the strategic game', () => {
    expect(game).toMatchObject({ owner: USERS.owner.sub, strategicGameOwner: USERS.owner.sub, accessType: 'private' });
  });

  describe('create', () => {
    it.each(['owner', 'other', 'admin'] as const)('lets %s create a game', async user => {
      await createGame(user);
    });

    it('forbids a user without roles to create a game [F-tactical-11]', async () => {
      const response = await as('noRole').post('/v1/tactical-games', { strategicGameId: 'sg-1', name: 'x', description: 'x' });
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'forbidden' });
    });

    it('rejects a request without a token', async () => {
      expect((await noToken().post('/v1/tactical-games').send({ strategicGameId: 'sg-1', name: 'x' })).status).toBe(401);
    });
  });

  describe('read', () => {
    it.each(['owner', 'admin'] as const)('lets %s read the game', async user => {
      expect((await as(user).get(`/v1/tactical-games/${game.id}`)).status).toBe(200);
    });

    it.each(['other', 'noRole'] as const)('forbids %s to read a private game [F-tactical-11]', async user => {
      expect((await as(user).get(`/v1/tactical-games/${game.id}`)).status).toBe(403);
      expect((await as(user).get(`/v1/tactical-games/${game.id}/finish-preview`)).status).toBe(403);
    });

    it('lets everybody read the game of a public strategic game', async () => {
      const open = await createGame('owner', { strategicGameId: 'sg-public' });
      expect(open.accessType).toBe('public');
      expect((await as('other').get(`/v1/tactical-games/${open.id}`)).status).toBe(200);
      expect((await as('noRole').get(`/v1/tactical-games/${open.id}`)).status).toBe(200);
    });

    it('lets the owner of an actor read the game', async () => {
      const withFaramir = await createGame('owner', { actors: [{ id: 'faramir', type: 'character' }] });
      expect((await as('other').get(`/v1/tactical-games/${withFaramir.id}`)).status).toBe(200);
    });

    it('lists only the games the user can read', async () => {
      const open = await createGame('owner', { strategicGameId: 'sg-public' });
      const listed = async (user: UserName) => ids((await as(user).get('/v1/tactical-games?size=100')).body);
      expect(await listed('owner')).toEqual(expect.arrayContaining([game.id, open.id]));
      expect(await listed('admin')).toEqual(expect.arrayContaining([game.id, open.id]));
      expect(await listed('other')).toContain(open.id);
      expect(await listed('other')).not.toContain(game.id);
      expect(await listed('noRole')).not.toContain(game.id);
    });

    it('rejects a request without a token', async () => {
      expect((await noToken().get(`/v1/tactical-games/${game.id}`)).status).toBe(401);
    });
  });

  describe('update', () => {
    it.each(['owner', 'admin'] as const)('lets %s change and play the game', async user => {
      expect((await as(user).patch(`/v1/tactical-games/${game.id}`, { name: `by ${user}`, description: 'x' })).status).toBe(200);
      expect((await as(user).post(`/v1/tactical-games/${game.id}/factions`, { factions: [`f-${user}`] })).status).toBe(200);
    });

    it.each(['other', 'noRole'] as const)('forbids %s to change, play or finish the game [F-tactical-11]', async user => {
      expect((await as(user).patch(`/v1/tactical-games/${game.id}`, { name: 'x', description: 'x' })).status).toBe(403);
      expect((await as(user).post(`/v1/tactical-games/${game.id}/rounds/start`)).status).toBe(403);
      expect((await as(user).post(`/v1/tactical-games/${game.id}/factions`, { factions: ['x'] })).status).toBe(403);
      expect((await as(user).post(`/v1/tactical-games/${game.id}/actors`, { actors: [{ id: 'faramir', type: 'character' }] })).status).toBe(
        403,
      );
      expect((await as(user).post(`/v1/tactical-games/${game.id}/finish`, { fates: [] })).status).toBe(403);
      expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).body).toMatchObject({ name: game.name, round: 0 });
    });

    it('lets the owner of the strategic game manage the game of another user', async () => {
      const inOther = await createGame('owner', { strategicGameId: 'sg-other' });
      expect(inOther.strategicGameOwner).toBe(USERS.other.sub);
      expect(
        (await as('other').patch(`/v1/tactical-games/${inOther.id}`, { name: 'by the strategic owner', description: 'x' })).status,
      ).toBe(200);
      expect((await as('other').post(`/v1/tactical-games/${inOther.id}/rounds/start`)).status).toBe(200);
    });

    it('does not let the owner of an actor manage the game', async () => {
      const withFaramir = await createGame('owner', { actors: [{ id: 'faramir', type: 'character' }] });
      expect((await as('other').post(`/v1/tactical-games/${withFaramir.id}/rounds/start`)).status).toBe(403);
    });

    it('rejects a request without a token', async () => {
      expect((await noToken().patch(`/v1/tactical-games/${game.id}`).send({ name: 'x', description: 'x' })).status).toBe(401);
    });
  });

  describe('delete', () => {
    it.each(['owner', 'admin'] as const)('lets %s delete the game', async user => {
      expect((await as(user).delete(`/v1/tactical-games/${game.id}`)).status).toBe(204);
    });

    it.each(['other', 'noRole'] as const)('forbids %s to delete the game [F-tactical-11]', async user => {
      expect((await as(user).delete(`/v1/tactical-games/${game.id}`)).status).toBe(403);
      expect((await as('owner').get(`/v1/tactical-games/${game.id}`)).status).toBe(200);
    });

    it('lets the owner of the strategic game delete it', async () => {
      const inOther = await createGame('owner', { strategicGameId: 'sg-other' });
      expect((await as('other').delete(`/v1/tactical-games/${inOther.id}`)).status).toBe(204);
    });

    it('rejects a request without a token', async () => {
      expect((await noToken().delete(`/v1/tactical-games/${game.id}`)).status).toBe(401);
    });
  });
});
