export class CriticalEffect {
  constructor(
    public status: string,
    public rounds: number | undefined,
    public value: number | undefined,
    public delay: number | undefined,
    public condition: string | undefined,
    /** `source`: the effect falls on the attacker (a critical that heals it), not on the target. */
    public applyTo?: 'source' | 'target',
  ) {}
}

/** Injury data of a critical entry (spec 013, §2): type, secondary injuries and marks. Missing: inferred. */
export interface CriticalInjury {
  type: string;
  secondary?: string[];
  flags?: string[];
}

export class CriticalResult {
  constructor(
    public text: string,
    public damage: number,
    public location: string,
    public effects: CriticalEffect[],
    public injury?: CriticalInjury,
  ) {}
}
