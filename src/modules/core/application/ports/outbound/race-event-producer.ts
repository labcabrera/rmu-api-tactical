import { Race } from 'src/modules/core/domain/entities/race';

export interface RaceEventProducer {
  created(entity: Race): Promise<void>;
  updated(entity: Race): Promise<void>;
  deleted(entity: Race): Promise<void>;
}
