import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors';
import { Character, isCharacterNotAble } from '../../../strategic/application/ports/character.port';
import { ActorRoundCharacterMapperPort } from '../../application/ports/actor-round-character-mapper-port';
import { ActorRound, BASE_ACTION_POINTS } from '../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAlert } from '../../domain/value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../../domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect, UNCONSCIOUS } from '../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../../domain/value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../../domain/value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../../domain/value-objets/actor-round-initiative.vo';
import { ActorRoundMovement } from '../../domain/value-objets/actor-round-movement.vo';
import { ActorRoundPenalty } from '../../domain/value-objets/actor-round-penalty.vo';
import { ActorRoundShield } from '../../domain/value-objets/actor-round-shield.vo';
import { ActorRoundTrait } from '../../domain/value-objets/actor-round-trait.vo';
import { Injury } from '../../domain/value-objets/injury.vo';
import { ActorRoundItem, ActorRoundItemKind, ActorRoundItemSlot } from '../../domain/value-objets/actor-round-item.vo';
import type { StrategicItem } from '../../../strategic/application/ports/item.port';

const ACTOR_SIZES: Record<string, number> = { medium: 0, small: -1, big: 1 };
const BODY_DEVELOPMENT_SKILL_ID = 'body-development';

@Injectable()
export class ActorRoundCharacterMapperAdapter implements ActorRoundCharacterMapperPort {
  toActorRound(gameId: string, round: number, character: Character, items: StrategicItem[] = []): ActorRound {
    if (isCharacterNotAble(character)) {
      throw new ValidationError(`Character ${character.id} is dead or permanently unconscious`, 'err-character-not-able');
    }
    if (ACTOR_SIZES[character.info.sizeId] === undefined) {
      throw new ValidationError(`Character size ${character.info.sizeId} not supported`);
    }
    let shield: ActorRoundShield | null = null;
    if (character.defense.shield) {
      shield = new ActorRoundShield(character.defense.shield.db, character.defense.shield.blockCount, 0);
    }
    const movement = new ActorRoundMovement(
      character.movement.baseMovementRate,
      character.equipment.maneuverPenalty + character.equipment.encumbrancePenalty,
      character.movement.maxPace,
      character.equipment.movementBaseDifficulty,
    );
    const actorRound = ActorRound.create(
      gameId,
      round,
      'character',
      character.id,
      character.name,
      ACTOR_SIZES[character.info.sizeId],
      character.info.raceName,
      character.experience.level,
      character.faction.id,
      movement,
      new ActorRoundInitiative(character.initiative.totalBonus, 0, undefined, undefined),
      BASE_ACTION_POINTS,
      new ActorRoundHP(character.hp.max, character.hp.current, this.getDeathThreshold(character)),
      ActorRoundFatigue.empty(),
      ActorRoundPenalty.empty(),
      new ActorRoundDefense(
        character.defense.defensiveBonus,
        character.defense.armor.at,
        character.defense.armor.headAt,
        character.defense.armor.bodyAt,
        character.defense.armor.armsAt,
        character.defense.armor.legsAt,
        shield,
        character.defense?.protect || 0,
      ),
      this.mapAttacksFromCharacter(character, items),
      [] as ActorRoundEffect[],
      [] as ActorRoundAlert[],
      character.imageUrl,
      character.owner,
      this.mapTraits(character),
    );
    // Spec 013, §3: the injuries not healed (same uuid) and the unresolved conditions come into the game.
    const injuries: Injury[] = (character.injuries || []).filter(injury => injury.status !== 'healed');
    const conditions = (character.conditions || []).filter(condition => !condition.resolvedAt);
    const conditionEffects = conditions
      .filter(condition => condition.status === 'unconscious')
      .map(condition => new ActorRoundEffect(condition.id, UNCONSCIOUS, undefined, undefined, round, 0, 0, undefined, condition.source));
    actorRound.initFromCharacter(character.id, injuries, conditionEffects, {
      hp: character.hp.current,
      injuryIds: injuries.map(injury => injury.id),
      conditionIds: conditions.map(condition => condition.id),
    });
    actorRound.initItems(this.mapItems(character, items));
    return actorRound;
  }

  /**
   * Spec 019, §2: the equipped items with their slot, and the other carried ones (not the stacks, such as coins), with
   * their strength and modifiers. Armor keeps the AT of its area and the shield its DB, as the sheet gives them.
   */
  private mapItems(character: Character, items: StrategicItem[]): ActorRoundItem[] {
    const slots: Record<string, string | null> = character.equipment?.slots || {};
    const slotOf = (itemId: string): ActorRoundItemSlot | undefined =>
      Object.entries(slots).find(([, id]) => id === itemId)?.[0] as ActorRoundItemSlot | undefined;
    return items
      .filter(item => !!slotOf(item.id) || (item.carried && !item.info?.stackable))
      .map(item => {
        const slot = slotOf(item.id);
        const kind: ActorRoundItemKind = !slot ? 'other' : item.weapon ? 'weapon' : item.shield ? 'shield' : item.armor ? 'armor' : 'other';
        const modifiers = (item.modifiers || []).map(modifier => ({ ...modifier }));
        const result: ActorRoundItem = {
          itemId: item.id,
          name: item.name,
          itemTypeId: item.itemTypeId,
          kind,
          strength: item.info?.strength ?? null,
          modifiers,
          startModifierIds: modifiers.map(modifier => modifier.id),
        };
        if (slot) result.slot = slot;
        const baseValue = this.getBaseValue(character, kind, slot);
        if (baseValue !== undefined) result.baseValue = baseValue;
        return result;
      });
  }

  private getBaseValue(character: Character, kind: ActorRoundItemKind, slot: ActorRoundItemSlot | undefined): number | undefined {
    if (kind === 'shield') {
      return character.defense.shield?.db ?? undefined;
    }
    if (kind !== 'armor' || !slot) {
      return undefined;
    }
    const armor = character.defense.armor;
    const bySlot: Record<string, number | null> = { body: armor.bodyAt, head: armor.headAt, arms: armor.armsAt, legs: armor.legsAt };
    return bySlot[slot] ?? armor.at ?? undefined;
  }

  /** Traits without an id (older sheets) are left out. */
  private mapTraits(character: Character): ActorRoundTrait[] {
    return (character.traits || [])
      .filter(trait => !!trait.traitId)
      .map(trait => new ActorRoundTrait(trait.traitId, trait.tier || 1, trait.specialization || null));
  }

  /** §9.8 Hits: the Body Development bonus. Undefined when the character has not the skill, falling back to `max`. */
  private getDeathThreshold(character: Character): number | undefined {
    return character.skills?.find(skill => skill.skillId === BODY_DEVELOPMENT_SKILL_ID)?.totalBonus;
  }

  /** The item of each attack: the one of the sheet, or the one in its slot for sheets before spec 019. */
  private mapAttacksFromCharacter(character: Character, items: StrategicItem[]): ActorRoundAttack[] {
    const slots: Record<string, string | null> = character.equipment?.slots || {};
    return character.attacks.map(attack => {
      const itemId = attack.itemId ?? slots[attack.attackName] ?? null;
      const roundAttack = new ActorRoundAttack(
        attack.attackName,
        [],
        attack.bo,
        attack.bo,
        attack.type,
        attack.attackTable,
        attack.fumbleTable,
        attack.sizeAdjustment,
        attack.fumble,
        false,
        attack.meleeRange,
        attack.ranges,
        attack.twoHanded ?? false,
        attack.weaponCategory ?? 'standard',
        attack.skillId || null,
      );
      roundAttack.itemId = itemId && items.some(item => item.id === itemId) ? itemId : null;
      return roundAttack;
    });
  }
}
