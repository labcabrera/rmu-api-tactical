import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { ActorType } from '../../../domain/value-objects/actor-type.vo';

export class CreateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly name: string,
    public readonly factions: string[],
    public readonly actors: CreateGameCommandActor[] | undefined,
    public readonly environment: CreateGameCommandEnvironment | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class CreateGameCommandEnvironment {
  constructor(
    public readonly temperatureFatigueModifier?: number,
    public readonly altitudeFatigueModifier?: number,
  ) {}
}
export class CreateGameCommandActor {
  constructor(
    public readonly id: string,
    public readonly type: ActorType,
    public readonly factionId: string | undefined,
  ) {}
}
