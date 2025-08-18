import { DomainEvent } from '../../../core/domain/events/domain-event';
import { Game } from '../entities/game.entity';

export class GameCreatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('GameCreatedEvent', data);
  }
}

export class GameUpdatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('GameUpdatedEvent', data);
  }
}

export class GameDeletedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('GameDeletedEvent', data);
  }
}
