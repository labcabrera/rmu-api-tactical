export type GameStatus = 'created' | 'in_progress' | 'finished';

export type GamePhase = 'not_started' | 'declare_actions' | 'declare_initative' | 'resolve_actions' | 'upkeep';

export type ActorType = 'character' | 'npc';

export interface Game {
  id: string;
  strategicGameId: string;
  name: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  actors: Actor[];
  description: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface Actor {
  id: string;
  name: string;
  factionId: string;
  type: ActorType;
}
