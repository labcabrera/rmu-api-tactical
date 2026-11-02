/**
 * Where a change of hits comes from (spec 013, §1.1): the attack table damage, the extra hits of a critical, a fumble,
 * the bleeding of an injury in the upkeep, an endurance roll, a `heal` effect, a game master adjustment or a poisoning (workspace spec 042).
 */
export type HpLogKind = 'attack' | 'critical' | 'fumble' | 'bleeding' | 'endurance' | 'treatment' | 'manual' | 'poison';

export const HP_LOG_KINDS: HpLogKind[] = ['attack', 'critical', 'fumble', 'bleeding', 'endurance', 'treatment', 'manual', 'poison'];

/** A change of the hits of an actor round (spec 013, §1.1). */
export interface HpLogEntry {
  id: string;
  round: number;
  /** 0 before the action phases, 1-4 in them, 5 in the upkeep. */
  phase?: number;
  /** Hits applied: negative is damage, positive healing (only what the maximum let in). */
  amount: number;
  kind: HpLogKind;
  actionId?: string;
  attackerId?: string;
  attackerName?: string;
  /** The injury that bleeds or is treated. */
  injuryId?: string;
  criticalKey?: string;
  at: string;
}

/** What a caller says of a change of hits: the actor round adds the id, the round and the time. */
export type HpChange = Omit<HpLogEntry, 'id' | 'round' | 'at'>;

/** Totals of a hits log by kind and by attacker (spec 013, §1.1). */
export interface HpBySource {
  byKind: Partial<Record<HpLogKind, number>>;
  byAttacker: Array<{ attackerId: string; attackerName?: string; amount: number }>;
}

export const HpLog = {
  /** Totals of the entries by kind and by attacker (entries without an attacker are left out of `byAttacker`). */
  bySource(entries: HpLogEntry[]): HpBySource {
    const byKind: Partial<Record<HpLogKind, number>> = {};
    const attackers = new Map<string, { attackerId: string; attackerName?: string; amount: number }>();
    entries.forEach(entry => {
      byKind[entry.kind] = (byKind[entry.kind] ?? 0) + entry.amount;
      if (entry.attackerId) {
        const current = attackers.get(entry.attackerId) ?? { attackerId: entry.attackerId, attackerName: entry.attackerName, amount: 0 };
        current.amount += entry.amount;
        current.attackerName = current.attackerName ?? entry.attackerName;
        attackers.set(entry.attackerId, current);
      }
    });
    return { byKind, byAttacker: [...attackers.values()] };
  },
};
