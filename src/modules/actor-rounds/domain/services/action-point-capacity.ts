import { ApModifier } from '../value-objets/ap-modifier.vo';

/** Action phases of a round, one base AP each (§8.3). */
export const ACTION_PHASES = 4;

export interface ActionPointCapacityOptions {
  /** AP already used in each phase (index 0 is phase 1): a loss in a phase falls on the next one with capacity left. */
  spent?: number[];
}

export interface ActionPointCapacityResult {
  /** AP of each phase, index 0 is phase 1. */
  capacity: number[];
  /** AP of phase losses with no capacity left in the round: they are lost in phase 1 of the next round (§9.8). */
  pendingLoss: number;
  /** The pending AP of `pendingLoss` by the effect of the loss that left them (losses without an effect left out). */
  pendingByEffect: Record<string, number>;
  /** Capacity each AP of another action takes while concentrating (1 without concentration). Not applied yet. */
  costMultiplier: number;
}

/**
 * AP capacity of an actor round by phase (spec 011, §1): pure and without state.
 *
 * 1. Every phase starts with 1 AP.
 * 2. The bonuses are added one by one from phase 4 back to phase 1, and round again (§8.3).
 * 3. The losses without a phase (surprise, Hold Kind, distraction) are taken from phase 1 onwards, never below 0.
 * 4. A loss in a phase (staggered, or a lasting loss applied in the middle of the round) is taken from that phase if
 *    it has capacity left (capacity not spent), else from the next one that has; with none left in the round it is
 *    pending for the next round. The phases before it, or already spent, keep their capacity.
 * 5. A cap takes the AP over it from phase 1 onwards. A flatfooted actor has a cap of 0.
 */
export class ActionPointCapacity {
  static compute(modifiers: ApModifier[], options: ActionPointCapacityOptions = {}): ActionPointCapacityResult {
    const capacity = new Array<number>(ACTION_PHASES).fill(1);
    const spent = Array.from({ length: ACTION_PHASES }, (_, i) => Math.max(0, options.spent?.[i] ?? 0));

    const bonus = ActionPointCapacity.sum(modifiers.filter(m => m.kind === 'bonus'));
    for (let i = 0; i < bonus; i++) {
      capacity[ACTION_PHASES - 1 - (i % ACTION_PHASES)] += 1;
    }

    ActionPointCapacity.takeFromFirstPhases(capacity, ActionPointCapacity.sum(modifiers.filter(m => m.kind === 'loss' && !m.phase)));

    let pendingLoss = 0;
    const pendingByEffect: Record<string, number> = {};
    modifiers
      .filter(m => m.kind === 'loss' && !!m.phase)
      .sort((a, b) => a.phase! - b.phase!)
      .forEach(modifier => {
        for (let i = 0; i < Math.max(0, modifier.value); i++) {
          const index = ActionPointCapacity.firstFreePhase(capacity, spent, modifier.phase! - 1);
          if (index === undefined) {
            pendingLoss += 1;
            if (modifier.effectId) {
              pendingByEffect[modifier.effectId] = (pendingByEffect[modifier.effectId] ?? 0) + 1;
            }
          } else {
            capacity[index] -= 1;
          }
        }
      });

    const caps = modifiers.filter(m => m.kind === 'cap').map(m => Math.max(0, m.value));
    if (caps.length > 0) {
      const cap = Math.min(...caps);
      const total = capacity.reduce((sum, value) => sum + value, 0);
      ActionPointCapacity.takeFromFirstPhases(capacity, total - cap);
    }

    const costMultiplier = modifiers.filter(m => m.kind === 'cost-multiplier').reduce((max, m) => Math.max(max, m.value), 1);
    return { capacity, pendingLoss, pendingByEffect, costMultiplier };
  }

  private static sum(modifiers: ApModifier[]): number {
    return modifiers.reduce((sum, m) => sum + Math.max(0, m.value), 0);
  }

  private static takeFromFirstPhases(capacity: number[], amount: number): void {
    let left = amount;
    for (let i = 0; i < capacity.length && left > 0; i++) {
      const taken = Math.min(capacity[i], left);
      capacity[i] -= taken;
      left -= taken;
    }
  }

  private static firstFreePhase(capacity: number[], spent: number[], from: number): number | undefined {
    for (let i = Math.max(0, from); i < capacity.length; i++) {
      if (capacity[i] - spent[i] > 0) {
        return i;
      }
    }
    return undefined;
  }
}
