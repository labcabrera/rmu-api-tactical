import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Npc, type NpcPort, NPC_PORT } from '../../../npcs/application/ports/npc.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { type FactionPort, FACTION_PORT, type StrategicFaction } from '../../../strategic/application/ports/faction.port.js';
import { Actor } from '../../domain/value-objects/actor.vo.js';
import { ENVIRONMENT_FACTION_ID, type GameNpc } from '../../domain/value-objects/environment-faction.vo.js';
import type { GameNpcRequest } from '../cqrs/commands/create-game.command.js';
import { type Realm, type RealmPort, REALM_PORT } from '../ports/realm.port.js';

/** Most specimens of one NPC entry (spec 055). */
export const MAX_NPC_COUNT = 50;

/** The game the NPCs join. */
export interface GameNpcsContext {
  strategicGameId: string;
  /** Realm of the campaign: an NPC is of this realm or of a generic one. */
  realmId: string | undefined;
  /** Owner of the tactical game: the game master, owner of the environment NPCs. */
  gameOwner: string;
  /** The factions of the game an NPC can join, besides the environment. */
  factionIds: string[];
  environmentName: string;
  /** Names of the actors the game already has, which the specimens do not repeat. */
  takenNames: string[];
}

export interface GameNpcsResult {
  actors: Actor[];
  /** The entries of the environment NPCs among them. */
  environmentNpcs: GameNpc[];
}

/**
 * Turns the NPCs requested for a tactical game into its actors (spec 055, decision 3): one actor per specimen, with an
 * id of its own and the NPC in `npcId`, named `Wolf 1`, `Wolf 2`... The NPC has to be readable by the owner of its
 * faction, of the campaign's realm or a generic one, and its faction in the game (or the environment). The owner of
 * the actors is the owner of the strategic faction, or the game master for the environment.
 */
@Injectable()
export class GameNpcsService {
  private readonly logger = new Logger(GameNpcsService.name);

  constructor(
    @Inject(NPC_PORT) private readonly npcPort: NpcPort,
    @Inject(FACTION_PORT) private readonly factionPort: FactionPort,
    @Inject(REALM_PORT) private readonly realmPort: RealmPort,
  ) {}

  /**
   * The actors of `requests` and, with `includeFactionNpcs`, of the NPCs of those strategic factions. A faction strategic
   * does not know brings no NPCs: the games take factions that are not in strategic.
   */
  async toActors(context: GameNpcsContext, requests: GameNpcRequest[], includeFactionNpcs: string[] = []): Promise<GameNpcsResult> {
    const lookup = new Lookup(this.npcPort, this.factionPort, this.realmPort);
    const factionRequests: GameNpcRequest[] = [];
    for (const factionId of includeFactionNpcs.filter(id => id !== ENVIRONMENT_FACTION_ID)) {
      const faction = await lookup.faction(factionId);
      if (!faction) {
        this.logger.warn(`Faction ${factionId} not found in strategic: it brings no NPCs`);
        continue;
      }
      (faction.npcs || []).forEach(npc => factionRequests.push({ npcId: npc.npcId, factionId, count: npc.count, name: npc.name }));
    }
    const taken = new Set(context.takenNames);
    const actors: Actor[] = [];
    const environmentNpcs: GameNpc[] = [];
    for (const request of [...factionRequests, ...requests]) {
      const count = request.count ?? 1;
      if (!Number.isInteger(count) || count < 1 || count > MAX_NPC_COUNT) {
        throw new ValidationError(`The specimens of an NPC go from 1 to ${MAX_NPC_COUNT}`, 'err-npc-count');
      }
      const { owner, factionName } = await this.factionOf(context, request.factionId, lookup);
      const npc = await this.readNpc(context, request.npcId, owner, lookup);
      const name = request.name?.trim() || npc.name;
      for (const actorName of GameNpcsService.specimenNames(name, count, taken)) {
        actors.push(
          Actor.fromProps({
            id: randomUUID(),
            npcId: npc.id,
            name: actorName,
            faction: { id: request.factionId, name: factionName },
            type: 'npc',
            owner,
          }),
        );
      }
      if (request.factionId === ENVIRONMENT_FACTION_ID) {
        environmentNpcs.push({ npcId: npc.id, count, name });
      }
    }
    return { actors, environmentNpcs };
  }

  /** An NPC sent in `actors` (before spec 055) is one specimen of it for its faction. */
  static legacyRequests(actors: { id: string; type: string; factionId: string | undefined }[] | undefined): GameNpcRequest[] {
    return (actors || [])
      .filter(actor => actor.type === 'npc')
      .map(actor => {
        if (!actor.factionId) {
          throw new ValidationError('NPC actor must have a faction');
        }
        return { npcId: actor.id, factionId: actor.factionId, count: 1 };
      });
  }

  /** `Wolf` for a single specimen, `Wolf 1`, `Wolf 2`... for several or when the name is taken, skipping taken names. */
  static specimenNames(name: string, count: number, taken: Set<string>): string[] {
    if (count === 1 && !taken.has(name)) {
      taken.add(name);
      return [name];
    }
    const names: string[] = [];
    for (let n = 1; names.length < count; n++) {
      const candidate = `${name} ${n}`;
      if (!taken.has(candidate)) {
        taken.add(candidate);
        names.push(candidate);
      }
    }
    return names;
  }

  private async factionOf(context: GameNpcsContext, factionId: string, lookup: Lookup): Promise<{ owner: string; factionName: string }> {
    if (factionId === ENVIRONMENT_FACTION_ID) {
      return { owner: context.gameOwner, factionName: context.environmentName };
    }
    if (!context.factionIds.includes(factionId)) {
      throw new ValidationError(`Faction ${factionId} is not part of the game`, 'err-npc-faction-not-in-game');
    }
    const faction = await lookup.faction(factionId);
    if (!faction) {
      throw new ValidationError(`Faction ${factionId} not found`, 'err-faction-not-found');
    }
    if (faction.gameId && faction.gameId !== context.strategicGameId) {
      throw new ValidationError(`Faction ${factionId} is not of the campaign of the game`, 'err-npc-faction-not-in-game');
    }
    return { owner: faction.owner, factionName: faction.name };
  }

  /** The NPC, readable by `owner` (public, or theirs) and of the campaign's realm or a generic one. */
  private async readNpc(context: GameNpcsContext, npcId: string, owner: string, lookup: Lookup): Promise<Npc> {
    const npc = await lookup.npc(npcId);
    if (!npc) {
      throw new ValidationError(`NPC ${npcId} not found`, 'err-npc-not-found');
    }
    if (npc.accessType === 'private' && npc.owner !== owner) {
      throw new ValidationError(`NPC ${npc.name} is private and not of the owner of its faction`, 'err-npc-not-readable');
    }
    if (npc.realmId !== context.realmId) {
      const realm = await lookup.realm(npc.realmId);
      if (!realm?.generic) {
        throw new ValidationError(`NPC ${npc.name} is not of the realm of the campaign nor of a generic one`, 'err-npc-realm');
      }
    }
    return npc;
  }
}

/** The NPCs, factions and realms read for one request, each one once. */
class Lookup {
  private readonly npcs = new Map<string, Promise<Npc | undefined>>();
  private readonly factions = new Map<string, Promise<StrategicFaction | null>>();
  private readonly realms = new Map<string, Promise<Realm | null>>();

  constructor(
    private readonly npcPort: NpcPort,
    private readonly factionPort: FactionPort,
    private readonly realmPort: RealmPort,
  ) {}

  npc(id: string): Promise<Npc | undefined> {
    return Lookup.once(this.npcs, id, () => this.npcPort.findById(id));
  }

  faction(id: string): Promise<StrategicFaction | null> {
    return Lookup.once(this.factions, id, () => this.factionPort.findById(id));
  }

  realm(id: string): Promise<Realm | null> {
    return Lookup.once(this.realms, id, () => this.realmPort.findById(id));
  }

  private static once<T>(cache: Map<string, Promise<T>>, id: string, read: () => Promise<T>): Promise<T> {
    let value = cache.get(id);
    if (!value) {
      value = read();
      cache.set(id, value);
    }
    return value;
  }
}
