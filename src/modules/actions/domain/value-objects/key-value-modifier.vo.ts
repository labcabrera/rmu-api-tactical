/**
 * Where a modifier comes from in the attack breakdown: who it favours, or which stage of the resolution adds it. Outside
 * combat (workspace spec 052): the skill, the casting conditions, the target's and the penalties.
 */
export type ModifierGroup =
  | 'offense'
  | 'defense'
  | 'situation'
  | 'critical'
  | 'resolution'
  | 'skill'
  | 'casting'
  | 'target'
  | 'penalty'
  /** The sense talents of a Perception or Tracking maneuver and Light Sensitivity (workspace spec 076, block C). */
  | 'senses'
  /** The magical talents of a Spellcasting Roll and Iron Will in a resistance roll (workspace spec 077, block C). */
  | 'talent';

/** Numbers a rule's explanation shows: the inputs of its formula (workspace spec 051). */
export type ModifierParams = Record<string, number | string | boolean>;

export class KeyValueModifier {
  constructor(
    public key: string,
    public value: number,
    /** Breakdown group of the combat plugin that added it. */
    public group?: ModifierGroup,
    /** Id of the combat plugin that added it. */
    public source?: string,
    /** Rule reference of the plugin (`§9.6`, `Table 9-5`), shown with the explanation. */
    public rule?: string,
    /** Inputs of the value, for its explanation. */
    public params?: ModifierParams,
  ) {}
}
