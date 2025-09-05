export interface StrategicGameClient {
  findById: (id: string) => Promise<StrategicGame | undefined>;
}

export interface StrategicGame {
  id: string;
  options?: StrategicGameOptions;
  owner: string;
}

export interface StrategicGameOptions {
  fatigueMultiplier?: number;
}
