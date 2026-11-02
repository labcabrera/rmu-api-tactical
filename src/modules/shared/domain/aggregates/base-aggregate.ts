import { AggregateRoot } from '@nestjs/cqrs';
import { DomainEvent } from '../events/domain-event.js';
import { ConflictError } from '../errors/errors.js';

/**
 * P: props of the aggregate, used in events and persistence.
 *
 * The version counts the stored writes (optimistic concurrency, as in rmu-api-core). It is not part of the props: the
 * repository sets it when it loads or stores the aggregate, and a write fails when the stored version moved on. Unlike
 * core, the aggregates keep their own fields (spec 020, decision 9), so the base only holds the id and the version.
 */
export abstract class BaseAggregateRoot<P extends { id: string }> extends AggregateRoot<DomainEvent<P>> {
  // An ECMAScript private field: the events carry the aggregate itself as their data, and JSON.stringify leaves it
  // out, so the Kafka payloads do not change (spec 020).
  #storedVersion = 0;
  #snapshot: string | undefined;

  protected constructor(public readonly id: string) {
    super();
  }

  get version(): number {
    return this.#storedVersion;
  }

  /**
   * Called by the repository with the version of the stored document, when it loads the aggregate and after each
   * write. It also takes the snapshot that hasChanges() compares with.
   */
  restoreVersion(version: number): this {
    this.#storedVersion = version;
    this.#snapshot = this.serializeState();
    return this;
  }

  /**
   * Whether the aggregate differs from what was loaded or last stored (spec 021, decision 9): a PATCH without changes
   * neither writes nor publishes. `updatedAt` does not count. An aggregate that was never stored always has changes.
   */
  hasChanges(): boolean {
    return this.#snapshot === undefined || this.serializeState() !== this.#snapshot;
  }

  private serializeState(): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- updatedAt is left out of the comparison
    const { updatedAt: _updatedAt, ...state } = this.getProps() as P & { updatedAt?: unknown };
    return JSON.stringify(state);
  }

  /** Rejects a change made on a stale copy: `expected` is the version the client read (undefined skips the check). */
  checkVersion(expected: number | undefined): void {
    if (expected === undefined || expected === this.#storedVersion) return;
    throw new ConflictError(`${this.id} is at version ${this.#storedVersion}, not ${expected}`, 'version-conflict');
  }

  abstract getProps(): P;
}
