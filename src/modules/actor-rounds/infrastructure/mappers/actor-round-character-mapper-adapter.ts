import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors';
import { Character } from '../../../strategic/application/ports/character.port';
import { ActorRoundCharacterMapperPort } from '../../application/ports/actor-round-character-mapper-port';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAlert } from '../../domain/value-objets/actor-round-alert.vo';
import { ActorRoundAttack, AttackRange } from '../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../../domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../../domain/value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../../domain/value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../../domain/value-objets/actor-round-initiative.vo';
import { ActorRoundPenalty } from '../../domain/value-objets/actor-round-penalty.vo';
import { ActorRoundShield } from '../../domain/value-objets/actor-round-shield.vo';

const DEFAULT_ACTION_POINTS = 4;
const ACTOR_SIZES: Record<string, number> = { medium: 0, small: -1, big: 1 };

@Injectable()
export class ActorRoundCharacterMapperAdapter implements ActorRoundCharacterMapperPort {
  toActorRound(gameId: string, round: number, character: Character): ActorRound {
    if (ACTOR_SIZES[character.info.sizeId] === undefined) {
      throw new ValidationError(`Character size ${character.info.sizeId} not supported`);
    }
    let shield: ActorRoundShield | null = null;
    if (character.defense.shield) {
      shield = new ActorRoundShield(character.defense.shield.db, character.defense.shield.blockCount, 0);
    }
    return ActorRound.create(
      gameId,
      round,
      character.id,
      character.name,
      ACTOR_SIZES[character.info.sizeId],
      character.info.raceName,
      character.experience.level,
      character.faction.id,
      new ActorRoundInitiative(character.initiative.totalBonus, 0, undefined, undefined),
      DEFAULT_ACTION_POINTS,
      new ActorRoundHP(character.hp.max, character.hp.current),
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
      ),
      this.mapAttacksFromCharacter(character),
      [] as ActorRoundEffect[],
      [] as ActorRoundAlert[],
      character.imageUrl,
      character.owner,
    );
  }

  private mapAttacksFromCharacter(character: Character): ActorRoundAttack[] {
    return character.attacks.map((attack) => {
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
        this.mapAttackRanges(character),
      );
    });
  }

  private mapAttackRanges(character: Character): AttackRange[] | undefined {
    if (!character.equipment || !character.equipment.mainHand) return undefined;
    const item = character.items.find((it) => it.id === character.equipment.mainHand);
    if (!item || !item.weapon) return undefined;
    if (item && item.weapon && item.weapon.modes && item.weapon.modes.length > 0) {
      return item.weapon.modes[0].ranges || undefined;
    }
    return undefined;
  }
}
