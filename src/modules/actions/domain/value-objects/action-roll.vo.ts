import { KeyValueModifier } from './key-value-modifier.vo.js';
import type { SkippedRule } from './skipped-rule.vo.js';

export class ActionRoll {
  constructor(
    public modifiers: KeyValueModifier[],
    public roll: number | null,
    public totalRoll: number | null,
    /** Rules that did not apply to the roll, and why (workspace spec 052). */
    public skipped?: SkippedRule[],
  ) {}
}
