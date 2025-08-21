export interface StrategicGameClient {
  findById: (id: string) => Promise<StrategicGame | undefined>;
}

export interface StrategicGame {
  id: string;
  owner: string;
}
