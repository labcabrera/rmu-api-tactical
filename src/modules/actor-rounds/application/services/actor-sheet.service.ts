import { Inject, Injectable } from '@nestjs/common';
import { type Npc, npcCatalogTalents, type NpcPort, NPC_PORT } from '../../../npcs/application/ports/npc.port.js';
import { ActorRoundTrait } from '../../domain/value-objects/actor-round-trait.vo.js';
import {
  type CharacterEquipment,
  type CharacterInfo,
  type CharacterPort,
  type CharacterStat,
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
  /** The talents of an NPC stat block in the talent catalog (workspace spec 076, §4), for actor rounds without traits. */
  npcTraits?: ActorRoundTrait[];
  /** Body weight of a character (workspace spec 079, decision B2); an NPC has none. */
  info?: Pick<CharacterInfo, 'weight'>;
  /** Stats of a character: the feats of strength read the St bonus (workspace spec 079, decision B2). */
  statistics?: Partial<Record<string, CharacterStat>>;
}

/** Skill of the passive, partial and full blocks (§9.6 Shields). */
const SHIELD_SKILL_ID = 'shield';

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

  /**
   * The skills of a stat block, with their total bonus; ranks it does not give stay unknown. The Shield ranks and bonus
   * of its shield (ADR 0010) become the `shield` skill the blocks read, unless the block lists that skill itself.
   */
  static fromNpc(npc: Npc): ActorSheet {
    const skills: CharacterSkill[] = (npc.skills || []).map(skill =>
      ActorSheetService.skillOf(skill.skillId, skill.bonus, skill.ranks, skill.specialization),
    );
    if (npc.shield && !skills.some(skill => skill.skillId === SHIELD_SKILL_ID)) {
      skills.push(ActorSheetService.skillOf(SHIELD_SKILL_ID, npc.shield.bonus ?? 0, npc.shield.ranks));
    }
    const npcTraits = ActorSheetService.npcTraits(npc);
    return { npc: true, skills, equipment: { maneuverPenalty: 0, encumbrancePenalty: 0 }, ...(npcTraits.length > 0 ? { npcTraits } : {}) };
  }

  /** Workspace spec 076, §4: the talents of the stat block with a catalog id, as traits (tier I when it gives none). */
  static npcTraits(npc: Npc): ActorRoundTrait[] {
    return npcCatalogTalents(npc).map(talent => new ActorRoundTrait(talent.traitId, talent.tier, null));
  }

  private static skillOf(skillId: string, bonus: number, ranks: number | null | undefined, specialization?: string | null): CharacterSkill {
    return {
      skillId,
      specialization: specialization ?? null,
      totalBonus: bonus,
      ...(ranks !== null && ranks !== undefined ? { ranks } : {}),
    };
  }
}
