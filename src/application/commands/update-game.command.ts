export interface UpdateGameCommand {
  readonly gameId: string;
  readonly name?: string;
  readonly description?: string;
}
