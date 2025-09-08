import { Action } from '../../../domain/entities/action.aggregate';

export interface ActionEventProducer {
  updated(entity: Action): Promise<void>;

  created(entity: Action): Promise<void>;

  deleted(entity: Action): Promise<void>;
}
