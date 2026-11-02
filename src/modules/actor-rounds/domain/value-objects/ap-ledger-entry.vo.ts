/**
 * What an entry of the AP ledger records: AP `spent` on an action, AP `lost` (an open action that could not advance)
 * or an `instant` action (the first of the round costs 0 AP).
 */
export type ApLedgerKind = 'spent' | 'lost' | 'instant';

/** An entry of the AP ledger of an actor round (spec 011, §2). */
export class ApLedgerEntry {
  constructor(
    /** Action phase (1-4). */
    public readonly phase: number,
    /** Action the AP went to. Missing in entries rebuilt from the phase log of older actor rounds. */
    public readonly actionId: string | undefined,
    public readonly ap: number,
    public readonly kind: ApLedgerKind,
  ) {}

  /** The entry takes capacity of its phase: a lost AP records a loss, it does not use the capacity. */
  static usesCapacity(entry: ApLedgerEntry): boolean {
    return entry.kind !== 'lost';
  }
}
