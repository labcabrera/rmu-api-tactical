import { inject, injectable } from 'inversify';

import { Game } from '@domain/entities/game.entity';
import { Logger } from '@domain/ports/logger';
import { EventNotificationPort } from '@domain/ports/outbound/event-notification.port';
import { GameRepository } from '@domain/ports/outbound/game.repository';

import { CreateGameCommand } from '@application/commands/create-game.command';
import { TYPES } from '@shared/types';
import { GameCreatedEvent } from '../../../domain/events/game-created.event';

@injectable()
export class CreateGameUseCase {
  constructor(
    @inject(TYPES.GameRepository) private readonly gameRepository: GameRepository,
    @inject(TYPES.EventNotificationPort) private readonly eventNotificationPort: EventNotificationPort<Game>,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.info(`Executing create game use case << ${command.name}`);
    let factions = command.factions || [];
    const newGame: Partial<Game> = {
      name: command.name,
      description: command.description,
      status: 'created',
      phase: 'not_started',
      factions: factions.length > 0 ? factions : this.defaultFactions(),
      round: 0,
      owner: command.username,
      createdAt: new Date(),
    };
    const savedGame = await this.gameRepository.save(newGame);
    this.logger.info(`Created tactical game with ID: ${savedGame.id}`);
    await this.eventNotificationPort.notify(new GameCreatedEvent(savedGame));
    return savedGame;
  }

  private defaultFactions(): string[] {
    return ['Light', 'Evil', 'Neutral'];
  }
}
