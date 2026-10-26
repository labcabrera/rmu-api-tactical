export class CriticalEffect {
  constructor(
    public status: string,
    public rounds: number | undefined,
    public value: number | undefined,
    public delay: number | undefined,
    public condition: string | undefined,
    /** `source`: the effect falls on the attacker (a critical that heals it), not on the target. */
    public applyTo?: 'source' | 'target',
    /** Limb of a `limb_useless` effect (`arm`, `leg`), spec 034. */
    public location?: string,
    /** Severity of the `additional_critical` of a fumble, spec 034. */
    public severity?: string,
    /** Dice of the value (`2d10`): the hits of a fumble, the distance of a knock back. `value` is then left out. */
    public dice?: string,
  ) {}

  /** An effect as the attack tables API gives it: a dice value goes to `dice`. */
  static fromTable(e: CriticalTableEffect): CriticalEffect {
    const dice = typeof e.value === 'string' ? e.value : undefined;
    const value = typeof e.value === 'number' ? e.value : undefined;
    return new CriticalEffect(e.status, e.rounds, value, e.delay, e.condition, e.applyTo, e.location, e.severity, dice);
  }
}

/** An effect of a critical or fumble entry of the attack tables API. */
export interface CriticalTableEffect {
  status: string;
  rounds?: number;
  /** A number, or dice (`1d10`) in the fumble tables. */
  value?: number | string;
  delay?: number;
  condition?: string;
  applyTo?: 'source' | 'target';
  location?: string;
  severity?: string;
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
