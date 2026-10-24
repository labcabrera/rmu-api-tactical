export interface StrategicGamePort {
  findById: (id: string) => Promise<StrategicGame | null>;
}

export const STRATEGIC_GAME_PORT = Symbol('StrategicGamePort');

export interface StrategicGame {
  id: string;
  options: StrategicGameOptions | null;
  owner: string;
}

export interface StrategicGameOptions {
  fatigueMultiplier: number | null;
  boardScaleMultiplier: number | null;
  /** Custom bonus to all attacks: `letality` is the name the strategic API uses (spec 013, §9.3). */
  letality?: number | null;
  /** Spec 011, §7: an action still open at the end of the round goes on in the next one. Missing means on. */
  openRounds?: boolean | null;
}

/** The open rounds option of a strategic game (spec 011, §7): on unless the game turns it off. */
/** The lethality option of a strategic game, 0 when missing. */
export const lethalityOf = (game: StrategicGame | null | undefined): number => game?.options?.letality || 0;

export const openRoundsOf = (game: StrategicGame | null | undefined): boolean => game?.options?.openRounds ?? true;
