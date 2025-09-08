import { ActorType } from './game.aggregate';

export interface Actor {
  id: string;
  name: string;
  factionId: string;
  type: ActorType;
  owner: string;
}
