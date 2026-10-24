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
    // The Kafka client id of the API (spec 021, decision 10); no consumer reads it.
    this.producer = process.env.RMU_KAFKA_CLIENT_ID || 'rmu-api-tactical';
    this.data = data;
  }
}
