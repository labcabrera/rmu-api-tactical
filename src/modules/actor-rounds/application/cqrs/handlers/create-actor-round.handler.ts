import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Actor } from '../../../../games/domain/value-objects/actor.vo';
import { ValidationError } from '../../../../shared/domain/errors';
import type { Character, CharacterPort } from '../../../../strategic/application/ports/character.port';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAlert } from '../../../domain/value-objets/actor-round-alert.vo';
import { ActorRoundAttack, AttackRange } from '../../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../../../domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../../../domain/value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../../../domain/value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../../../domain/value-objets/actor-round-initiative.vo';
import { ActorRoundPenalty } from '../../../domain/value-objets/actor-round-penalty.vo';
import { ActorRoundShield } from '../../../domain/value-objets/actor-round-shield.vo';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { CreateActorRoundCommand } from '../commands/create-actor-round.command';

const DEFAULT_ACTION_POINTS = 4;

@CommandHandler(CreateActorRoundCommand)
export class CreateActorRoundHandler implements ICommandHandler<CreateActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(CreateActorRoundHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
  ) {}

  async execute(command: CreateActorRoundCommand): Promise<ActorRound> {
    this.logger.log(`Creating actor round ${command.actor.id} for game ${command.gameId} round ${command.round}`);
    const actor = await this.buildActorRound(command.gameId, command.actor, command.round);
    const updated = await this.actorRoundRepository.save(actor);
    return updated;
  }

  public async buildActorRound(gameId: string, actor: Actor, round: number): Promise<ActorRound> {
    if (round === 1) {
      return await this.buildFromTemplate(gameId, actor, round);
    }
    // character could be added in a later round
    const prev = await this.actorRoundRepository.findByActorIdAndRound(actor.id, round - 1);
    if (prev) {
      return ActorRound.createFromPrevious(prev);
    }
    return await this.buildFromTemplate(gameId, actor, round);
  }

  public async buildFromTemplate(gameId: string, actor: Actor, round: number): Promise<ActorRound> {
    if (actor.type === 'character') {
      return await this.buildActorRoundFromCharacter(gameId, round, actor.id);
    } else {
      throw new NotImplementedException(`Actor type ${actor.type} not supported yet`);
    }
  }

  private async buildActorRoundFromCharacter(gameId: string, round: number, characterId: string): Promise<ActorRound> {
    const character = await this.characterClient.findById(characterId);
    if (!character) throw new ValidationError(`Character ${characterId} not found`);
    return ActorRound.create(
      gameId,
      round,
      character.id,
      character.name,
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
        this.mapShield(character),
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

  private mapShield(character: Character): ActorRoundShield | undefined {
    if (!character.equipment || !character.equipment.offHand) {
      return undefined;
    }
    const item = character.items.find((it) => it.id === character.equipment.offHand);
    if (item?.category === 'shield') {
      switch (item.itemTypeId) {
        //TODO read custom shield properties
        case 'target-shield':
          return new ActorRoundShield('target', 15, 1, 0);
        case 'normal-shield':
          return new ActorRoundShield('normal', 20, 2, 0);
        case 'full-shield':
          return new ActorRoundShield('full', 25, 3, 0);
        case 'wall-shield':
          return new ActorRoundShield('wall', 30, 4, 0);
        default:
          return undefined;
      }
    }
  }
}
