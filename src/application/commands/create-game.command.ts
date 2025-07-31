export interface CreateGameCommand {
  readonly user: string;
  readonly name: string;
  readonly description?: string;
  readonly factions?: string[];
}
