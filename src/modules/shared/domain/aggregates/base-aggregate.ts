import { AggregateRoot } from '@nestjs/cqrs';
import { DomainEvent } from '../events/domain-event';

/**
 * P: Props type for the aggregate, used in events and persistence
 */
export abstract class BaseAggregateRoot<P> extends AggregateRoot<DomainEvent<P>> {
  public constructor(public readonly id: string) {
    super();
  }

  public abstract getProps(): P;
}
