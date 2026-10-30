/** Reads the factions of rmu-api-strategic with the service token (spec 055). */
export interface FactionPort {
  findById: (id: string) => Promise<StrategicFaction | null>;
}

export const FACTION_PORT = Symbol('FactionPort');

export interface StrategicFaction {
  id: string;
  gameId: string;
  name: string;
  owner: string;
  /** The NPCs of the faction (spec 055); missing in strategic versions before it. */
  npcs?: FactionNpc[];
}

/** An NPC of a faction with its number of specimens (spec 055). */
export interface FactionNpc {
  id: string;
  npcId: string;
  /** Alias in the campaign, the NPC's name by default. */
  name: string;
  count: number;
  notes: string | null;
}
