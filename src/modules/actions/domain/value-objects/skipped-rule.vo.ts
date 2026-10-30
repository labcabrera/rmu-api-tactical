import type { ModifierGroup, ModifierParams } from './key-value-modifier.vo.js';

/** A rule that did not apply to a roll, and why (workspace spec 051; maneuvers and spells since spec 052). */
export class SkippedRule {
  constructor(
    /** Id of the combat plugin. */
    public source: string,
    public group: ModifierGroup,
    /** Kebab-case reason, the key of its explanation. */
    public reason: string,
    /** Combat phase that evaluated it (a parry declared again replaces the ones of its phase), or the roll's kind. */
    public phase: string,
    /** Rule reference of the plugin. */
    public rule?: string,
    public params?: ModifierParams,
  ) {}
}
