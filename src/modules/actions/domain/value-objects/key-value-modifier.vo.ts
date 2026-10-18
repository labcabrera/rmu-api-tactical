/** Where a modifier comes from in the attack breakdown: who it favours, or which stage of the resolution adds it. */
export type ModifierGroup = 'offense' | 'defense' | 'situation' | 'critical' | 'resolution';

export class KeyValueModifier {
  constructor(
    public key: string,
    public value: number,
    /** Breakdown group of the combat plugin that added it. */
    public group?: ModifierGroup,
    /** Id of the combat plugin that added it. */
    public source?: string,
  ) {}
}
