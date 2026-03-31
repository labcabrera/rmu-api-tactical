import { ActorRoundFaction } from '../../../actor-rounds/domain/value-objets/actor-round-faction.vo';
import { ActorType } from './actor-type.vo';

export interface ActorProps {
  id: string;
  name: string;
  faction: ActorRoundFaction;
  type: ActorType;
  owner: string;
}

export class Actor {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly faction: ActorRoundFaction,
    public readonly type: ActorType,
    public readonly owner: string,
  ) {}

  static fromProps(props: ActorProps): Actor {
    return new Actor(props.id, props.name, props.faction, props.type, props.owner);
  }

  equals(other: Actor): boolean {
    return (
      this.id === other.id &&
      this.name === other.name &&
      this.faction.id === other.faction.id &&
      this.type === other.type &&
      this.owner === other.owner
    );
  }
}
