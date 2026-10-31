import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo.js';

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
    /** Spec 055: the NPCs of the strategic factions become actors too. Undefined means true. */
    public readonly includeFactionNpcs?: boolean,
    /** Spec 055: NPCs for the factions of the game (or `environment`). */
    public readonly npcs?: GameNpcRequest[],
    /** Spec 055: the environment faction, with its NPCs. */
    public readonly environmentFaction?: CreateGameCommandEnvironmentFaction,
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

/** NPCs requested for a faction of the game (spec 055): `count` specimens, 1 by default, named after `name` or the NPC. */
export interface GameNpcRequest {
  npcId: string;
  factionId: string;
  count?: number;
  name?: string;
}

export interface CreateGameCommandEnvironmentFaction {
  name?: string;
  npcs: Omit<GameNpcRequest, 'factionId'>[];
}
