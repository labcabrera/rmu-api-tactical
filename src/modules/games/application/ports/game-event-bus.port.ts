import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { Game } from '../../domain/entities/game.aggregate';

export interface GameEventBusPort {
  publish(event: DomainEvent<Game>): void;

  deleted(entity: Game): Promise<void>;
}
