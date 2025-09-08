import { ActorType } from './actor-type.vo';

export class Actor {
  constructor(
    public id: string,
    public name: string,
    public factionId: string,
    public type: ActorType,
    public owner: string,
  ) {}

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
