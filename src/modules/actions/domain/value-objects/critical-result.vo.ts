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

  /**
   * An effect as the attack tables API gives it: a dice value goes to `dice`, and a delay in minutes (`delayDuration`)
   * becomes rounds of 5 seconds.
   */
  static fromTable(e: CriticalTableEffect): CriticalEffect {
    const dice = typeof e.value === 'string' ? e.value : undefined;
    const value = typeof e.value === 'number' ? e.value : undefined;
    const delay = e.delay ?? roundsOf(e.delayDuration);
    return new CriticalEffect(e.status, e.rounds, value, delay, e.condition, e.applyTo, e.location, e.severity, dice);
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
  /** A delay given as time (`1 minute`). */
  delayDuration?: string;
}

/** Rounds of 5 seconds (§8.1) in a time of whole minutes (`1 minute`, `2 minutes`); undefined for anything else. */
const roundsOf = (duration: string | undefined): number | undefined => {
  const match = duration ? /^(\d+) minutes?$/.exec(duration.trim()) : null;
  return match ? Number(match[1]) * 12 : undefined;
};

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
