export interface StrategicGamePort {
  findById: (id: string) => Promise<StrategicGame | null>;
}

export interface StrategicGame {
  id: string;
  options: StrategicGameOptions | null;
  owner: string;
}

export interface StrategicGameOptions {
  fatigueMultiplier: number | null;
  boardScaleMultiplier: number | null;
  lethality: number | null;
  /** Spec 011, §7: an action still open at the end of the round goes on in the next one. Missing means on. */
  openRounds?: boolean | null;
}

/** The open rounds option of a strategic game (spec 011, §7): on unless the game turns it off. */
export const openRoundsOf = (game: StrategicGame | null | undefined): boolean => game?.options?.openRounds ?? true;
