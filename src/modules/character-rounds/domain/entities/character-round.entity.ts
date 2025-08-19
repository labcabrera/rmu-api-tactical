export interface CharacterRound {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  initiative: CharacterRoundInitiative;
  actionPoints: number;
  hp: CharacterRoundHP;
  effects: CharacterRoundEffect[];
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface CharacterRoundHP {
  max: number;
  current: number;
}

export interface CharacterRoundEffect {
  status: string;
  value: number | undefined;
  rounds: number | undefined;
}

export interface CharacterRoundInitiative {
  base: number;
  penalty: number;
  roll: number | undefined;
  total: number | undefined;
}
