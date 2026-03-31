import { ActorType } from '../../../domain/value-objects/actor-type.vo';

export class CreateGameCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly name: string,
    public readonly factions: string[],
    public readonly actors: CreateGameCommandActor[] | undefined,
    public readonly environment:
      | { temperatureFatigueModifier?: number | undefined; altitudeFatigueModifier?: number | undefined }
      | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class CreateGameCommandActor {
  constructor(
    public readonly id: string,
    public readonly type: ActorType,
    public readonly factionId: string | undefined,
  ) {}
}
