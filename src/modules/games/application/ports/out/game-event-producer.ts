import { Game } from '../../../domain/entities/game.entity';

export interface GameEventProducer {
  updated(entity: Game): Promise<void>;
  created(entity: Game): Promise<void>;
  deleted(entity: Game): Promise<void>;
}
