export interface RaceClient {
  //TODO change any to a specific type
  getRaceById(raceId: string): Promise<any>;
}
