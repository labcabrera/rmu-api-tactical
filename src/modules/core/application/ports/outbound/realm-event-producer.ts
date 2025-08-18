import { Realm } from 'src/modules/core/domain/entities/realm';

export interface RealmEventProducer {
  updated(entity: Realm): Promise<void>;
  created(entity: Realm): Promise<void>;
  deleted(entity: Realm): Promise<void>;
}
