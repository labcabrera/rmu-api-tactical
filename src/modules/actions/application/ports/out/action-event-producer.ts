import { Action } from '../../../domain/entities/action.entity';

export interface ActionEventProducer {
  updated(entity: Action): Promise<void>;

  created(entity: Action): Promise<void>;

  deleted(entity: Action): Promise<void>;
}
