import { DomainEvent } from '../../../core/domain/events/domain-event';
import { Game } from '../entities/game.entity';

export class GameCreatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('GameCreatedEvent', data);
  }
}
