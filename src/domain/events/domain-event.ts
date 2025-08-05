export interface DomainEvent {
  readonly eventType: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
  toJSON(): Record<string, any>;
}
