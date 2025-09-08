export type GameStatus = 'created' | 'in_progress' | 'finished';
export type GamePhase = 'not_started' | 'declare_initiative' | 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4' | 'upkeep';
export type ActorType = 'character' | 'npc';

export interface Game {
  id: string;
  strategicGameId: string;
  name: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  factions: string[];
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
  owner: string;
}
