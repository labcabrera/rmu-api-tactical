import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { GameProps } from '../../domain/aggregates/game.props';

export interface GameEventBusPort {
  publish(event: DomainEvent<GameProps>): void;
}
