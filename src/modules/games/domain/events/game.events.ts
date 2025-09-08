import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { Game } from '../entities/game.aggregate';

export class GameCreatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('created', data);
  }
}

export class GameUpdatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('updated', data);
  }
}

export class GameDeletedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('deleted', data);
  }
}

export class GameRoundStartedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('round-started', data);
  }
}

export class GamePhaseStartedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('phase-started', data);
  }
}
