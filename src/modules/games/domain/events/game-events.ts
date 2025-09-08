import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { Game } from '../entities/game.aggregate';

export class GameCreatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('tactical-game-created', data);
  }
}

export class GameUpdatedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('tactical-game-updated', data);
  }
}

export class GameDeletedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('tactical-game-deleted', data);
  }
}

export class GameRoundStartedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('tactical-game-round-started', data);
  }
}

export class GamePhaseStartedEvent extends DomainEvent<Game> {
  constructor(data: Game) {
    super('tactical-game-phase-started', data);
  }
}
