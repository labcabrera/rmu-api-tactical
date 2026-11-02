import type { AttackLocation } from './attack-location.vo.js';
import { KeyValueModifier } from './key-value-modifier.vo.js';
import type { SkippedRule } from './skipped-rule.vo.js';

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: KeyValueModifier[],
    public rollTotal: number,
    /** Location hit: the called one; without a called shot no location is rolled (§9.7). */
    public location: AttackLocation | undefined,
    public criticalAdjustment: number | undefined = undefined,
    public criticalModifiers?: KeyValueModifier[],
    public breakageRoll?: boolean,
    /** Fumble range used when rolling: the weapon's, widened by the target's Foiler. Missing in older actions. */
    public fumble?: number,
    /** Rules that did not apply, and why (spec 051). Missing in older actions. */
    public skipped?: SkippedRule[],
  ) {}
}
