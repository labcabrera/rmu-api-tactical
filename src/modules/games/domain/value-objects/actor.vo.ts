import { ActorRoundFaction } from '../../../actor-rounds/domain/value-objects/actor-round-faction.vo.js';
import type { ActorType } from './actor-type.vo.js';

export interface ActorProps {
  /** The character sheet of a character; a uuid of its own for each specimen of an NPC (spec 055). */
  id: string;
  name: string;
  faction: ActorRoundFaction;
  type: ActorType;
  owner: string;
  /** The NPC of rmu-api-npcs an NPC actor is a specimen of (spec 055); none for characters. */
  npcId?: string;
}

export class Actor {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly faction: ActorRoundFaction,
    public readonly type: ActorType,
    public readonly owner: string,
    public readonly npcId: string | undefined,
  ) {}

  static fromProps(props: ActorProps): Actor {
    return new Actor(props.id, props.name, props.faction, props.type, props.owner, props.npcId ?? undefined);
  }

  /** The same actor in a faction renamed (the environment, spec 055). */
  withFactionName(name: string): Actor {
    return new Actor(this.id, this.name, { ...this.faction, name }, this.type, this.owner, this.npcId);
  }

  equals(other: Actor): boolean {
    return (
      this.id === other.id &&
      this.name === other.name &&
      this.faction.id === other.faction.id &&
      this.type === other.type &&
      this.owner === other.owner &&
      this.npcId === other.npcId
    );
  }
}
