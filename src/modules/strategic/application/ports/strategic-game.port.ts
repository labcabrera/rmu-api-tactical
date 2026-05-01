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
}
