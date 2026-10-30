import type { ModifierGroup, ModifierParams } from './key-value-modifier.vo.js';

/** A combat rule that did not apply to an attack, and why (workspace spec 051). */
export class SkippedRule {
  constructor(
    /** Id of the combat plugin. */
    public source: string,
    public group: ModifierGroup,
    /** Kebab-case reason, the key of its explanation. */
    public reason: string,
    /** Combat phase that evaluated it: a parry declared again replaces the ones of its phase. */
    public phase: string,
    /** Rule reference of the plugin. */
    public rule?: string,
    public params?: ModifierParams,
  ) {}
}
