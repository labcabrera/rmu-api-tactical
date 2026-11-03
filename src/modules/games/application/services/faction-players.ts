import type { FactionPort } from '../../../strategic/application/ports/faction.port.js';
import { StrategicMembers } from '../../domain/value-objects/strategic-member.vo.js';

/**
 * The players of some strategic factions (workspace spec 072, decision 13), for a game that gets them before any
 * `faction.updated` event: a game being created or factions being added. A faction strategic does not know, or of a
 * strategic version without players, is left out.
 */
export async function factionPlayersOf(factionPort: FactionPort, factionIds: string[]): Promise<Record<string, string[]>> {
  const factions = await Promise.all([...new Set(factionIds)].map(id => factionPort.findById(id)));
  const players: Record<string, string[]> = {};
  for (const faction of factions) {
    if (faction && Array.isArray(faction.players)) players[faction.id] = StrategicMembers.players(faction.players);
  }
  return players;
}
