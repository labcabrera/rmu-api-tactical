export interface CharacterRound {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  initiative?: CharacterRoundInitiative;
  actionPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CharacterRoundInitiative {
  base: number;
  penalty: number;
  roll: number;
  total: number;
}
