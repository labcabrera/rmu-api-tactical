import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Actor } from '../../../../games/domain/entities/actor.vo';
import { ValidationError } from '../../../../shared/domain/errors';
import type { Character, CharacterPort } from '../../../../strategic/application/ports/character.port';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../../../domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../../../domain/value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../../../domain/value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../../../domain/value-objets/actor-round-initiative.vo';
import { ActorRoundPenalty } from '../../../domain/value-objets/actor-round-penalty.vo';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
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
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      initiativeBase = character.initiative.baseBonus;
      attacks = this.mapAttacksFromCharacter(character);
      maxHp = character.hp.max;
      currentHp = character.hp.current;
      defense = new ActorRoundDefense(
        character.defense.defensiveBonus,
        character.defense.armor.at,
        character.defense.armor.headAt,
        character.defense.armor.bodyAt,
        character.defense.armor.armsAt,
        character.defense.armor.legsAt,
      );
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
      'todo-owner',
    );
  }

  private mapAttacksFromCharacter(character: Character): ActorRoundAttack[] {
    return character.attacks.map((attack) => {
      return {
        attackName: attack.attackName,
        boModifiers: [],
        baseBo: attack.bo,
        currentBo: attack.bo,
        attackType: 'melee',
        attackTable: attack.attackTable,
        fumbleTable: attack.fumbleTable,
        attackSize: 'medium',
        fumble: attack.fumble,
        canThrow: false,
      } as ActorRoundAttack;
    });
  }
}
