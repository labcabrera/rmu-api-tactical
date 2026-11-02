import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { CriticalEffect } from '../value-objects/critical-result.vo.js';

/** Status of the hits a fumble does to the fumbler: a number, or dice (`1d10`, `2d10`). */
export const FUMBLE_HITS = 'hits';
/** Status of a critical a fumble gives the fumbler, of `severity`: the game master rolls it. */
export const ADDITIONAL_CRITICAL = 'additional_critical';

const DICE = /^(\d+)d(\d+)$/;

/**
 * Workspace spec 034 (answer 3): the hits of a fumble entry. Fixed hits are taken as they are; for dice, `given` is the
 * game master's sum, which has to be a possible one, or the dice are rolled here.
 */
export class FumbleHits {
  static resolve(effects: CriticalEffect[] | undefined, given?: number): number {
    return (effects || [])
      .filter(effect => effect.status === FUMBLE_HITS)
      .reduce((sum, effect) => sum + (effect.dice ? FumbleHits.roll(effect.dice, given) : Math.max(0, effect.value ?? 0)), 0);
  }

  /** The dice of the entry, undefined when its hits are fixed or it has none. */
  static diceOf(effects: CriticalEffect[] | undefined): string | undefined {
    return (effects || []).find(effect => effect.status === FUMBLE_HITS && effect.dice)?.dice;
  }

  private static roll(dice: string, given?: number): number {
    const match = DICE.exec(dice);
    if (!match) {
      throw new ValidationError(`Invalid fumble dice ${dice}`, 'err-fumble-invalid-dice');
    }
    const count = Number(match[1]);
    const sides = Number(match[2]);
    if (given !== undefined && given !== null) {
      if (!Number.isInteger(given) || given < count || given > count * sides) {
        throw new ValidationError(`The fumble hits are ${dice}: from ${count} to ${count * sides}`, 'err-fumble-invalid-hits');
      }
      return given;
    }
    return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1).reduce((sum, die) => sum + die, 0);
  }
}
