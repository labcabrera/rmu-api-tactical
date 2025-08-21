export interface ActorRound {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  effects: ActorRoundEffect[];
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface ActorRoundHP {
  max: number;
  current: number;
}

export interface ActorRoundEffect {
  status: string;
  value: number | undefined;
  rounds: number | undefined;
}

export interface ActorRoundInitiative {
  base: number;
  penalty: number;
  roll: number | undefined;
  total: number | undefined;
}
