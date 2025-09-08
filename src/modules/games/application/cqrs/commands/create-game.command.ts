import { ActorType } from '../../../domain/entities/actor-type.vo';

export class CreateGameCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly name: string,
    public readonly factions: string[],
    public readonly actors: CreateGameCommandActor[] | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class CreateGameCommandActor {
  constructor(
    public readonly id: string,
    public readonly type: ActorType,
    public readonly faction: string | undefined,
  ) {}
}
