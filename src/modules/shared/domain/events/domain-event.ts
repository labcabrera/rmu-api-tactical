export class DomainEvent<E> {
  public readonly eventType: string;
  public readonly eventVersion: string;
  public readonly eventTime: Date;
  public readonly producer: string;
  public readonly data: E;

  constructor(eventType: string, data: E) {
    this.eventType = eventType;
    this.eventVersion = '1';
    this.eventTime = new Date();
    this.producer = 'rmu-api-core';
    this.data = data;
  }
}
