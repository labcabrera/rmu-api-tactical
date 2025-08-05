import { AuthenticatedCommand } from '@application/commands/authenticated-command';

export interface CreateGameCommand extends AuthenticatedCommand {
  readonly name: string;
  readonly description?: string;
  readonly factions?: string[];
}
