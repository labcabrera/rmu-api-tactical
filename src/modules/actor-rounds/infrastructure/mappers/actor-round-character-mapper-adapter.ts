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

const ACTOR_SIZES: Record<string, number> = { medium: 0, small: -1, big: 1 };
const BODY_DEVELOPMENT_SKILL_ID = 'body-development';

@Injectable()
export class ActorRoundCharacterMapperAdapter implements ActorRoundCharacterMapperPort {
  toActorRound(gameId: string, round: number, character: Character): ActorRound {
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
        (character as any).defense?.protect || 0,
      ),
      this.mapAttacksFromCharacter(character),
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
    return actorRound;
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

  private mapAttacksFromCharacter(character: Character): ActorRoundAttack[] {
    return character.attacks.map(attack => {
      return new ActorRoundAttack(
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
    });
  }
}
