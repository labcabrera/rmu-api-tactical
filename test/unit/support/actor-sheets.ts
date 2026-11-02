import { ActorSheetService } from '../../../src/modules/actor-rounds/application/services/actor-sheet.service.js';
import type { Npc } from '../../../src/modules/npcs/application/ports/npc.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';

/** The sheets of the actors over a fake character port and, for NPC actors (spec 055), the given stat blocks. */
export const sheetsOf = (characters: CharacterPort, npcs: Npc[] = []): ActorSheetService =>
  new ActorSheetService(characters, { findById: (id: string) => Promise.resolve(npcs.find(npc => npc.id === id)) });
