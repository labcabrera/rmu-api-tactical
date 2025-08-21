import { Inject, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/entities/actor-round.entity';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import * as cr from '../../../../strategic/application/ports/out/character-client';
import { Actor, Game } from '../../../domain/entities/game.entity';
import * as gep from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { StartRoundCommand } from '../start-round.command';

@CommandHandler(StartRoundCommand)
export class StartRoundCommandHandler implements ICommandHandler<StartRoundCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly characterRoundRepository: crr.ActorRoundRepository,
    @Inject('CharacterClient') private readonly characterClient: cr.CharacterClient,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventProducer,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    if (game.actors.length < 1) {
      throw new ValidationError('No actors associated with the game have been found');
    }
    const gameUpdate: Partial<Game> = {
      ...game,
      status: 'in_progress',
      round: game.round + 1,
    };
    const updatedGame = await this.gameRepository.update(gameId, gameUpdate);
    await this.createCharacterRounds(updatedGame);
    await this.gameEventProducer.updated(updatedGame);
    return updatedGame;
  }

  private async createCharacterRounds(game: Game): Promise<void> {
    for (const actor of game.actors) {
      await this.createTacticalCharacterRound(game.id, actor, game.round);
    }
  }

  private async createTacticalCharacterRound(gameId: string, actor: Actor, round: number): Promise<void> {
    let baseInitiative = 0;
    let hp = 0;
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      baseInitiative = character.initiative.baseBonus;
      hp = character.hp.max;
    } else {
      throw new NotImplementedException('NPCs are not implemented yet');
    }
    const entity: Partial<ActorRound> = {
      gameId: gameId,
      actorId: actor.id,
      round: round,
      initiative: {
        base: baseInitiative,
        penalty: 0,
        roll: undefined,
        total: undefined,
      },
      actionPoints: 4,
      hp: {
        current: hp,
        max: hp,
      },
      effects: [],
      owner: actor.owner,
      createdAt: new Date(),
    };
    await this.characterRoundRepository.save(entity);
  }
}
