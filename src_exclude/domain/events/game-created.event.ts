import { Game } from '@domain/entities/game.entity';
import { DomainEvent } from './domain-event';

export class GameCreatedEvent extends DomainEvent<Game> {
  constructor(readonly game: Game) {
    super('GameCreatedEvent', game);
  }
}
