/** Reserved faction id of the environment of a tactical game (spec 055, decision 2). */
export const ENVIRONMENT_FACTION_ID = 'environment';

/** Name of the environment when none is given; the front translates it. */
export const DEFAULT_ENVIRONMENT_NAME = 'Environment';

/** NPCs of one kind chosen for the environment: `count` specimens, each one an actor of the game. */
export interface GameNpc {
  npcId: string;
  count: number;
  /** Alias of the entry, the NPC's name by default; its actors are named after it. */
  name: string;
}

/**
 * The environment of a tactical game (spec 055, decision 2): the creatures and characters of no player, owned by the
 * game master. It only exists in tactical. Not to be confused with `GameEnvironment`, the fatigue modifiers.
 */
export interface EnvironmentFaction {
  factionId: typeof ENVIRONMENT_FACTION_ID;
  name: string;
  npcs: GameNpc[];
}

export const EnvironmentFactions = {
  create(name: string | undefined, npcs: GameNpc[] = []): EnvironmentFaction {
    return { factionId: ENVIRONMENT_FACTION_ID, name: name?.trim() || DEFAULT_ENVIRONMENT_NAME, npcs: npcs.map(npc => ({ ...npc })) };
  },

  copy(faction: EnvironmentFaction): EnvironmentFaction {
    return { factionId: ENVIRONMENT_FACTION_ID, name: faction.name, npcs: (faction.npcs || []).map(npc => ({ ...npc })) };
  },

  /** Adds the entries: one of the same NPC and name takes the specimens. */
  merge(npcs: GameNpc[], added: GameNpc[]): GameNpc[] {
    const merged = npcs.map(npc => ({ ...npc }));
    for (const entry of added) {
      const same = merged.find(npc => npc.npcId === entry.npcId && npc.name === entry.name);
      if (same) {
        same.count += entry.count;
      } else {
        merged.push({ ...entry });
      }
    }
    return merged;
  },

  /**
   * Takes one specimen of the NPC off its entries: the entry the actor is named after (`Wolf` for `Wolf 2`), or the last
   * one of that NPC. An entry left without specimens goes away.
   */
  removeSpecimen(npcs: GameNpc[], npcId: string, actorName: string): GameNpc[] {
    const result = npcs.map(npc => ({ ...npc }));
    const named = (npc: GameNpc) => npc.npcId === npcId && (actorName === npc.name || actorName.startsWith(`${npc.name} `));
    const entry = result.find(named) ?? [...result].reverse().find(npc => npc.npcId === npcId);
    if (entry) {
      entry.count -= 1;
    }
    return result.filter(npc => npc.count > 0);
  },
};
