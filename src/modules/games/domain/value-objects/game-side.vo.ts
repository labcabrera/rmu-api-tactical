import { ValidationError } from '../../../shared/domain/errors/errors.js';

/**
 * A side of a tactical game (workspace spec 100, decision 1): factions that fight together. Every faction of the game is
 * in one side and only one. `name` null lets the front name it after its factions; `leaderActorId` is an actor of the
 * side, the default leader of its group checks and the one of the `leader-down` trigger.
 */
export interface GameSide {
  id: string;
  name: string | null;
  factionIds: string[];
  leaderActorId: string | null;
}

/** How the fear of the upkeep is alerted (workspace spec 100, decision 18): by heads (the book) or by levels (house). */
export type PsychologyRules = 'book' | 'house';
export const PSYCHOLOGY_RULES: PsychologyRules[] = ['book', 'house'];

/** Rules of the games stored before spec 100, which have no field. */
export const LEGACY_PSYCHOLOGY_RULES: PsychologyRules = 'book';
/** Rules of the new games when none is chosen. */
export const DEFAULT_PSYCHOLOGY_RULES: PsychologyRules = 'house';

/** Side ids are used as Mongo keys, like the faction ids. */
export const SIDE_ID_PATTERN = /^[\w-]{1,64}$/;
export const SIDE_NAME_MAX_LENGTH = 60;

export const GameSides = {
  /** The side of a faction alone, as the game has it when no sides are defined. */
  single(factionId: string, id = factionId): GameSide {
    return { id, name: null, factionIds: [factionId], leaderActorId: null };
  },

  copy(side: GameSide): GameSide {
    return { id: side.id, name: side.name ?? null, factionIds: [...side.factionIds], leaderActorId: side.leaderActorId ?? null };
  },

  /** An id for a new side of `factionId` not taken by another side. */
  freeId(sides: GameSide[], factionId: string): string {
    const taken = new Set(sides.map(side => side.id));
    if (!taken.has(factionId)) return factionId;
    let n = 2;
    while (taken.has(`${factionId}-${n}`)) n++;
    return `${factionId}-${n}`;
  },

  /**
   * The sides sent by the game master, checked against the factions of the game (workspace spec 100, contract of
   * `PUT sides`): valid unique ids, names of 60 characters at most and an exact partition of the factions with no
   * empty side (`err-sides-invalid`); a leader is an actor of its side (`err-side-leader-invalid`).
   */
  validate(sides: GameSide[], factions: string[], actorFactionOf: (actorId: string) => string | undefined): GameSide[] {
    const invalid = (message: string) => new ValidationError(message, 'err-sides-invalid');
    const ids = new Set<string>();
    const assigned = new Map<string, string>();
    const result: GameSide[] = [];
    for (const side of sides) {
      if (typeof side.id !== 'string' || !SIDE_ID_PATTERN.test(side.id)) {
        throw invalid(`Invalid side id ${side.id}`);
      }
      if (ids.has(side.id)) {
        throw invalid(`Duplicated side id ${side.id}`);
      }
      ids.add(side.id);
      const name = side.name?.trim() || null;
      if (name && name.length > SIDE_NAME_MAX_LENGTH) {
        throw invalid(`The name of side ${side.id} is longer than ${SIDE_NAME_MAX_LENGTH} characters`);
      }
      const factionIds = side.factionIds ?? [];
      if (factionIds.length === 0) {
        throw invalid(`Side ${side.id} has no factions`);
      }
      for (const factionId of factionIds) {
        if (!factions.includes(factionId)) {
          throw invalid(`Faction ${factionId} is not part of the game`);
        }
        if (assigned.has(factionId)) {
          throw invalid(`Faction ${factionId} is in sides ${assigned.get(factionId)} and ${side.id}`);
        }
        assigned.set(factionId, side.id);
      }
      const leaderActorId = side.leaderActorId || null;
      if (leaderActorId) {
        const leaderFaction = actorFactionOf(leaderActorId);
        if (!leaderFaction || !factionIds.includes(leaderFaction)) {
          throw new ValidationError(`The leader ${leaderActorId} is not an actor of side ${side.id}`, 'err-side-leader-invalid');
        }
      }
      result.push({ id: side.id, name, factionIds: [...factionIds], leaderActorId });
    }
    const missing = factions.filter(factionId => !assigned.has(factionId));
    if (sides.length > 0 && missing.length > 0) {
      throw invalid(`Factions without a side: ${missing.join(', ')}`);
    }
    return result;
  },
};
