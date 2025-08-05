import { Game } from '@domain/entities/game.entity';
import { DomainEvent } from './domain-event';

export class GameCreatedEvent implements DomainEvent {
    
  public readonly eventType = 'GameCreatedEvent';
  public readonly eventVersion = 1;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;

  constructor(public readonly game: Game) {
    this.aggregateId = game.id;
    this.game = game;
    this.occurredOn = new Date();
  }

  toJSON(): object {
    return {
      id: this.aggregateId,
      name: this.game.name,
      description: this.game.description,
      owner: this.game.owner
      //TODO add other properties as needed
    };
  }
}
