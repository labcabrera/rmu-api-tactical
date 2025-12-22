import { ActorType } from './actor-type.vo';

export interface ActorProps {
  id: string;
  name: string;
  factionId: string;
  type: ActorType;
  owner: string;
}

export class Actor {
  private constructor(
    public id: string,
    public name: string,
    public factionId: string,
    public type: ActorType,
    public owner: string,
  ) {}

  static fromProps(props: ActorProps): Actor {
    return new Actor(props.id, props.name, props.factionId, props.type, props.owner);
  }

  equals(other: Actor): boolean {
    return (
      this.id === other.id &&
      this.name === other.name &&
      this.factionId === other.factionId &&
      this.type === other.type &&
      this.owner === other.owner
    );
  }
}
