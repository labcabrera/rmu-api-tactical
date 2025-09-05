import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Game, GamePhase } from '../../../domain/entities/game.entity';
import * as gep from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { StartPhaseCommand } from '../start-phase.command';
import { StartRoundCommand } from '../start-round.command';

@CommandHandler(StartPhaseCommand)
export class StartPhaseCommandHandler implements ICommandHandler<StartPhaseCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: crr.ActorRoundRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventProducer,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    if (game.status !== 'in_progress') {
      throw new ValidationError(`Game is not in progress. Current status: ${game.status}`);
    }
    if (game.phase === 'declare_initiative') {
      const pending = await this.actorRoundRepository.countWithUndefinedInitiativeRoll(game.id, game.round);
      if (pending > 0) {
        throw new ValidationError(`There are still ${pending} character rounds without initiative declared`);
      }
    }
    let nextPhase: GamePhase;
    switch (game.phase) {
      case 'declare_initiative':
        nextPhase = 'phase_1';
        break;
      case 'phase_1':
        nextPhase = 'phase_2';
        break;
      case 'phase_2':
        nextPhase = 'phase_3';
        break;
      case 'phase_3':
        nextPhase = 'phase_4';
        break;
      default:
        throw new ValidationError(`Cannot start next phase from phase ${game.phase}`);
    }
    game.phase = nextPhase;
    const updatedGame = await this.gameRepository.update(game.id, game);
    await this.gameEventProducer.updated(updatedGame);
    return updatedGame;
  }
}
