import { Injectable } from '@nestjs/common';
import type { Actor } from '../../../games/domain/value-objects/actor.vo.js';
import {
  MEDIUM_SIZE_CLASS,
  type Npc,
  type NpcAttack,
  type NpcShield,
  SHIELD_TYPES,
  sizeClassOf,
} from '../../../npcs/application/ports/npc.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ActorRoundNpcMapperPort } from '../../application/ports/actor-round-npc-mapper.port.js';
import { ActorRound, BASE_ACTION_POINTS } from '../../domain/aggregates/actor-round.js';
import { ActorSheetService } from '../../application/services/actor-sheet.service.js';
import { ActorRoundAttack, type WeaponCategory } from '../../domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundDefense } from '../../domain/value-objects/actor-round-defense.vo.js';
import { ActorRoundFatigue } from '../../domain/value-objects/actor-round-fatigue.vo.js';
import { ActorRoundHP } from '../../domain/value-objects/actor-round-hp.vo.js';
import { ActorRoundInitiative } from '../../domain/value-objects/actor-round-initiative.vo.js';
import { ActorRoundMovement } from '../../domain/value-objects/actor-round-movement.vo.js';
import { ActorRoundPenalty } from '../../domain/value-objects/actor-round-penalty.vo.js';
import { type ActorRoundResistance, RESISTANCE_TYPES } from '../../domain/value-objects/actor-round-resistance.vo.js';
import { ActorRoundShield } from '../../domain/value-objects/actor-round-shield.vo.js';

/** Fumble table of a creature attack that gives none. */
const DEFAULT_FUMBLE_TABLE = 'animals';
/** Fumble range of a creature attack: the stat block gives none, so only an unmodified 01 fumbles. */
const NPC_FUMBLE = 1;
/** Shield blocks per round of a shield type Table 9-6 does not list. */
const UNKNOWN_SHIELD_BLOCKS = 1;
/** Movement base difficulty of an unarmored character (casual), as the stat block has no armor penalties. */
const UNARMORED_MOVEMENT_DIFFICULTY = 'c';
/** Attack tables of natural weapons, which a disarmed creature still attacks with. */
const NATURAL_ATTACK_TABLES = [
  'beak',
  'bite',
  'claw',
  'crush',
  'grapple',
  'horn',
  'ram',
  'stinger',
  'trample',
  'unarmed-strikes',
  'unarmed-sweeps',
];

/**
 * The actor round of a specimen of an NPC (spec 055, decision 4), from the Combat Stat Block of rmu-api-npcs (spec
 * 054), in the units of the character mapper: the size and the attack sizes are steps from medium, the death
 * threshold is the hits below zero it survives. The attacks with no table are left out (spec 060). The critical size
 * and the critical code I come in (workspace spec 075), and the talents with a catalog id (workspace spec 076); the sequences, cooperation, katas, the other critical codes
 * and the poisons of the attacks are not applied (spec 056 candidate); the game master picks the attack.
 */
@Injectable()
export class ActorRoundNpcMapperAdapter implements ActorRoundNpcMapperPort {
  toActorRound(gameId: string, round: number, actor: Actor, npc: Npc): ActorRound {
    const sizeClass = sizeClassOf(npc.size);
    if (sizeClass === undefined) {
      throw new ValidationError(`NPC size ${npc.size} not supported`);
    }
    const shield = npc.shield ? ActorRoundNpcMapperAdapter.mapShield(npc.shield) : null;
    const actorRound = ActorRound.create(
      gameId,
      round,
      'npc',
      actor.id,
      actor.name,
      sizeClass - MEDIUM_SIZE_CLASS,
      npc.category,
      npc.level,
      actor.faction.id,
      this.mapMovement(npc),
      new ActorRoundInitiative(npc.initiative, 0, undefined, undefined),
      BASE_ACTION_POINTS,
      new ActorRoundHP(npc.hp, npc.hp, ActorRoundNpcMapperAdapter.deathThreshold(npc)),
      // Workspace spec 077, decision D9: the endurance of an NPC is its Body Development, if it has it.
      new ActorRoundFatigue(npc.skills?.find(skill => skill.skillId === 'body-development')?.bonus ?? 0, 0, 0),
      ActorRoundPenalty.empty(),
      new ActorRoundDefense(npc.db, npc.at, npc.at, npc.at, npc.at, npc.at, shield, 0),
      (npc.attacks || []).flatMap((attack, index) => (attack.attackTable ? [this.mapAttack(attack, attack.attackTable, index)] : [])),
      [],
      [],
      npc.imageUrl ?? undefined,
      actor.owner,
      // Workspace spec 076, §4: the talents of the stat block in the catalog (senses, vision...).
      ActorSheetService.npcTraits(npc),
    );
    actorRound.npcId = npc.id;
    actorRound.resistances = this.mapResistances(npc);
    actorRound.frightLevel = npc.frightLevel ?? null;
    actorRound.criticalSize = ActorRoundNpcMapperAdapter.criticalSize(npc, sizeClass);
    actorRound.reduceCriticalSeverity = !!npc.criticalCodes?.reduceSeverity;
    actorRound.stunImmune = !!npc.criticalCodes?.stunImmune;
    return actorRound;
  }

  /**
   * The size it suffers criticals as (T-3.1d; workspace spec 075, decision 3), in steps from medium: only when the
   * stat block gives one that differs from its size (an unknown id is ignored); null takes its size.
   */
  static criticalSize(npc: Npc, sizeClass: number): number | null {
    const criticalClass = npc.criticalSize ? sizeClassOf(npc.criticalSize) : undefined;
    return criticalClass === undefined || criticalClass === sizeClass ? null : criticalClass - MEDIUM_SIZE_CLASS;
  }

  /**
   * The hits below zero it survives. An actor round dies when its hits go below `-deathThreshold`; an NPC dies when its
   * damage reaches its Death Hits (spec 055, plan), so at `hp - deathHits` hits: one less than the difference. A stat
   * block without Death Hits falls back to `hp`, as an actor round without a threshold.
   */
  static deathThreshold(npc: Npc): number | undefined {
    return npc.deathHits === null || npc.deathHits === undefined ? undefined : npc.deathHits - npc.hp - 1;
  }

  /**
   * The shield of the stat block (ADR 0010): its DB, or the one of its type for an NPC stored without it, and the
   * blocks of its type (Table 9-6). The Shield skill goes to the sheet (`ActorSheetService.fromNpc`), not here.
   */
  static mapShield(shield: NpcShield): ActorRoundShield {
    const type = SHIELD_TYPES[shield.type];
    return new ActorRoundShield(shield.db ?? type?.db ?? 0, type?.blocks ?? UNKNOWN_SHIELD_BLOCKS, 0);
  }

  /** The first mode of movement of the stat block (the main one), with no armor penalty. */
  private mapMovement(npc: Npc): ActorRoundMovement {
    const movement = npc.movement?.[0];
    return new ActorRoundMovement(movement?.baseRate ?? 0, 0, movement?.maxPace ?? 'walk', UNARMORED_MOVEMENT_DIFFICULTY);
  }

  /**
   * One attack per line of the stat block, named after its table and its place in the stat block (`bite-1`). An attack
   * with no table (`we`, `rw`, special attacks) is skipped (spec 060, decision 6), and the others keep the line number
   * of the stat block, not a renumbered one, so `claw-3` is still the third line the game master reads. Its size, as
   * the attack size of a character sheet, is its size class against medium: the attack size plugin takes the target's
   * size off.
   */
  private mapAttack(attack: NpcAttack, attackTable: string, index: number): ActorRoundAttack {
    const weaponCategory: WeaponCategory = NATURAL_ATTACK_TABLES.includes(attackTable) ? 'natural' : 'standard';
    return new ActorRoundAttack(
      `${attackTable}-${index + 1}`,
      [],
      attack.ob,
      attack.ob,
      'melee',
      attackTable,
      attack.fumbleTable || DEFAULT_FUMBLE_TABLE,
      attack.size - MEDIUM_SIZE_CLASS,
      NPC_FUMBLE,
      false,
      null,
      null,
      false,
      weaponCategory,
      null,
    );
  }

  private mapResistances(npc: Npc): ActorRoundResistance[] {
    const resistances = npc.resistances;
    if (!resistances) {
      return [];
    }
    return RESISTANCE_TYPES.map(resistance => ({ resistance, totalBonus: resistances[resistance] ?? 0 }));
  }
}
