import { ActorType } from './actor-type.vo';

export interface Actor {
  id: string;
  name: string;
  factionId: string;
  type: ActorType;
  owner: string;
}
