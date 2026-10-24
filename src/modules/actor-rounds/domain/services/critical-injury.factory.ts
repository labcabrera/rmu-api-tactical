import { randomUUID } from 'crypto';
import { BLEEDING, PENALTY } from '../value-objects/actor-round-effect.vo.js';
import {
  type BodySide,
  buildInjury,
  type Injury,
  INJURY_FLAGS,
  type InjuryFlag,
  type InjurySource,
  toBodyLocation,
} from '../value-objects/injury.vo.js';
import { InjuryTypeResolver } from './injury-type.resolver.js';

export interface CriticalEffectData {
  status: string;
  value?: number;
  rounds?: number;
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

/**
 * Spec 013, §3: a critical (or fumble) with penalty or bleeding makes one injury, of the type of its data or the
 * inferred one, plus one injury without penalty for each secondary type, all with the same source. The rest of its
 * effects stay effects.
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
    const type = InjuryTypeResolver.resolve(input.criticalType, location, input.injury?.type);
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
    const secondary = InjuryTypeResolver.known(input.injury?.secondary ?? undefined).map(secondaryType =>
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
