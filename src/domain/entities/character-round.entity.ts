export interface CharacterRound {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  initiative?: TacticalCharacterRoundInitiative;
  actionPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TacticalCharacterRoundInitiative {
  base: number;
  penalty: number;
  roll: number;
  total: number;
}


