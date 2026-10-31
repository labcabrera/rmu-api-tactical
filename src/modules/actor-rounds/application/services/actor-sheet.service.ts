import { Inject, Injectable } from '@nestjs/common';
import { type Npc, type NpcPort, NPC_PORT } from '../../../npcs/application/ports/npc.port.js';
import {
  type CharacterEquipment,
  type CharacterPort,
  type CharacterSkill,
  CHARACTER_PORT,
} from '../../../strategic/application/ports/character.port.js';
import type { ActorRound } from '../../domain/aggregates/actor-round.js';

/**
 * What the actions read of an actor's sheet (spec 055): its skills and its equipment penalties. A character sheet is
 * one; the stat block of an NPC gives its skills with their total bonus, and no equipment penalties.
 */
export interface ActorSheet {
  skills: CharacterSkill[];
  equipment?: Pick<CharacterEquipment, 'maneuverPenalty' | 'encumbrancePenalty'>;
  /** The stat block of an NPC: a skill it does not list counts 0, not as unskilled. */
  npc?: boolean;
}

/** The actor in the shape the sheet readers need: an actor round, or what identifies its sheet. */
export type SheetActor = Pick<ActorRound, 'actorType' | 'actorId' | 'characterId' | 'npcId'>;

/**
 * Reads the sheet of an actor: the strategic character of a character, or the stat block of the NPC of a specimen
 * (spec 055). Nothing calls strategic for an NPC.
 */
@Injectable()
export class ActorSheetService {
  constructor(
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(NPC_PORT) private readonly npcPort: NpcPort,
  ) {}

  async find(actor: SheetActor): Promise<ActorSheet | undefined> {
    if (actor.actorType === 'npc') {
      if (!actor.npcId) return undefined;
      const npc = await this.npcPort.findById(actor.npcId);
      return npc ? ActorSheetService.fromNpc(npc) : undefined;
    }
    return this.characterClient.findById(actor.characterId || actor.actorId);
  }

  /** The skills of a stat block, with their total bonus; ranks it does not give stay unknown. */
  static fromNpc(npc: Npc): ActorSheet {
    return {
      npc: true,
      skills: (npc.skills || []).map(skill => ({
        skillId: skill.skillId,
        specialization: skill.specialization ?? null,
        totalBonus: skill.bonus,
        ...(skill.ranks !== null && skill.ranks !== undefined ? { ranks: skill.ranks } : {}),
      })),
      equipment: { maneuverPenalty: 0, encumbrancePenalty: 0 },
    };
  }
}
