import type { AttackLocation } from './attack-location.vo.js';
import { KeyValueModifier } from './key-value-modifier.vo.js';
import type { SkippedRule } from './skipped-rule.vo.js';

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: KeyValueModifier[],
    public rollTotal: number,
    /**
     * Location hit: the called one or, against a target with armour by location, the one of the critical roll sent with
     * the attack roll (workspace spec 077, decision B2.2). Otherwise none until a critical hits one.
     */
    public location: AttackLocation | undefined,
    public criticalAdjustment: number | undefined = undefined,
    public criticalModifiers?: KeyValueModifier[],
    public breakageRoll?: boolean,
    /** Fumble range used when rolling: the weapon's, widened by the target's Foiler. Missing in older actions. */
    public fumble?: number,
    /** Rules that did not apply, and why (spec 051). Missing in older actions. */
    public skipped?: SkippedRule[],
    /**
     * Workspace spec 077, decision B2.3: the unmodified critical roll sent with the attack roll that decided the location;
     * the criticals of the attack are rolled with it. Missing when the location was not rolled.
     */
    public locationRoll?: number,
  ) {}
}
