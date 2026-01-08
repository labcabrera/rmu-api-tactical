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
import type { ActorRoundRepository } from '../../ports/out/actor-round.repository';
import { CreateActorRoundCommand } from '../commands/create-actor-round.command';

@CommandHandler(CreateActorRoundCommand)
export class CreateActorRoundHandler implements ICommandHandler<CreateActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(CreateActorRoundHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    // @Inject('ActorRoundEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: CreateActorRoundCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actor = await this.buildActorRound(command.gameId, command.actor, command.round);
    const updated = await this.actorRoundRepository.save(actor);
    //const events = actor.pullDomainEvents();
    // events.forEach((event) => this.gameEventBus.publish(event));
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
    let initiativeBase = 0;
    let attacks: ActorRoundAttack[] = [];
    let maxHp = 0;
    let currentHp = 0;
    let defense: ActorRoundDefense;
    let imageUrl: string | undefined = undefined;
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      initiativeBase = character.initiative.baseBonus;
      attacks = this.mapAttacksFromCharacter(character);
      maxHp = character.hp.max;
      currentHp = character.hp.current;
      const shield = this.mapShield(character);
      defense = new ActorRoundDefense(
        character.defense.defensiveBonus,
        character.defense.armor.at,
        character.defense.armor.headAt,
        character.defense.armor.bodyAt,
        character.defense.armor.armsAt,
        character.defense.armor.legsAt,
        shield,
      );
      imageUrl = character.imageUrl;
    } else {
      throw new NotImplementedException('NPCs are not implemented yet');
    }
    return ActorRound.create(
      gameId,
      round,
      actor.id,
      actor.name,
      new ActorRoundInitiative(initiativeBase, 0, undefined, undefined),
      4,
      new ActorRoundHP(maxHp, currentHp),
      new ActorRoundFatigue(0, 0, 0),
      [] as ActorRoundPenalty[],
      defense,
      attacks,
      [] as ActorRoundEffect[],
      [] as ActorRoundAlert[],
      imageUrl,
      //TODO read from faction
      'todo-owner',
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
    //TODO get active mode
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
