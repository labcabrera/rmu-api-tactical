export interface CharacterClient {
  findById: (id: string) => Promise<Character | undefined>;

  findByGameId: (gameId: string) => Promise<Character[]>;
}

//TODO
export interface Character {
  id: string;
  gameId: string;
  hp: CharacterHP;
  initiative: CharacterInitiative;
  owner: string;
}

export interface CharacterHP {
  max: number;
}

export interface CharacterInitiative {
  baseBonus: number;
}
