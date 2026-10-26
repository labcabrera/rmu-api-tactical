import { randomUUID } from 'crypto';
import { BLEEDING, PENALTY } from '../value-objects/actor-round-effect.vo.js';
import {
  type BodySide,
  buildInjury,
  type Injury,
  INJURY_FLAGS,
  type InjuryFlag,
  type InjurySource,
  type InjuryType,
  toBodyLocation,
} from '../value-objects/injury.vo.js';
import { InjuryTypeResolver } from './injury-type.resolver.js';

export interface CriticalEffectData {
  status: string;
  value?: number;
  rounds?: number;
  /** Rounds before the effect starts (spec 034). */
  delay?: number;
  /** Limb of a `limb_useless` effect (spec 034). */
  location?: string;
  /** Severity of the `additional_critical` of a fumble (spec 034). */
  severity?: string;
}

export interface CriticalInjuryData {
  type?: string | null;
  secondary?: string[] | null;
  flags?: string[] | null;
}

export interface CriticalInjuryInput {
  effects: CriticalEffectData[];
  /** Critical table code (`S`, `K`, `P`...), undefined for a fumble. */
  criticalType?: string;
  location?: string | null;
  side?: BodySide;
  injury?: CriticalInjuryData | null;
  /** Slow (-) and Rapid (+) Bleeder: added to each new bleeding wound. */
  bleedingShift?: number;
  source: InjurySource;
}

export interface CriticalInjuryResult {
  injuries: Injury[];
  /** The effects that are not penalty or bleeding. */
  effects: CriticalEffectData[];
}

/** The type a bleeding wound's penalty heals as (ch. 13, Bleeding Injuries). */
const CUT: InjuryType = 'cut-burn';

/**
 * Spec 013, §3: a critical (or fumble) with penalty or bleeding makes one injury, of the type of its data or the
 * inferred one, plus one injury without penalty for each secondary type, all with the same source. The rest of its
 * effects stay effects.
 *
 * Workspace spec 022, D8: when the critical both bleeds and has a penalty, the penalty is the wound's, healed and
 * recovered as a cut: the main injury (penalty and bleeding) is a cut, and the type of the critical (a bone, an organ)
 * is kept as one more secondary injury without penalty, so it can still be treated. In the critical data
 * (`data/core-law/critical-tables`, 2026-10-24) 145 entries have both: 60 cuts, 40 organ, 21 muscle, 20 bone, 4 skin.
 */
export class CriticalInjuryFactory {
  static build(input: CriticalInjuryInput): CriticalInjuryResult {
    const shift = input.bleedingShift ?? 0;
    let penalty = 0;
    let bleeding = 0;
    const effects: CriticalEffectData[] = [];
    for (const effect of input.effects) {
      if (effect.status === PENALTY) {
        penalty += Math.min(0, effect.value ?? 0);
      } else if (effect.status === BLEEDING) {
        bleeding += Math.max(0, (effect.value ?? 0) + shift);
      } else {
        effects.push(effect);
      }
    }
    if (penalty === 0 && bleeding === 0) {
      return { injuries: [], effects };
    }
    const location = toBodyLocation(input.location);
    const resolved = InjuryTypeResolver.resolve(input.criticalType, location, input.injury?.type);
    const bleedingWound = penalty < 0 && bleeding > 0;
    const type = bleedingWound ? CUT : resolved;
    const flags = (input.injury?.flags || []).filter((flag): flag is InjuryFlag => INJURY_FLAGS.includes(flag as InjuryFlag));
    const createdAt = new Date();
    const main = buildInjury({
      id: randomUUID(),
      type,
      location,
      side: input.side,
      penalty,
      bleeding,
      flags,
      source: input.source,
      createdAt,
    });
    const secondaryTypes = InjuryTypeResolver.known(input.injury?.secondary ?? undefined);
    if (bleedingWound && resolved !== CUT && resolved !== 'unknown' && !secondaryTypes.includes(resolved)) {
      secondaryTypes.unshift(resolved);
    }
    const secondary = secondaryTypes.map(secondaryType =>
      buildInjury({
        id: randomUUID(),
        type: secondaryType,
        location,
        side: input.side,
        penalty: 0,
        severity: main.severity,
        source: input.source,
        createdAt,
      }),
    );
    return { injuries: [main, ...secondary], effects };
  }
}
