import { DomainEvent } from './domain-event';

export class RealmDeletedEvent implements DomainEvent {
  
  public eventType = 'RealmDeleted';
  public eventVersion = 1;
  public occurredOn: Date;
  public readonly aggregateId: string;

  constructor(
    public readonly realmId: string,
    public readonly realmName: string,
    public readonly deletedAt: Date
  ) {
    this.aggregateId = realmId;
    this.occurredOn = deletedAt;
  }

  toJSON(): Record<string, any> {
    return {
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      realmId: this.realmId,
      realmName: this.realmName,
      deletedAt: this.deletedAt.toISOString()
    };
  }
}
