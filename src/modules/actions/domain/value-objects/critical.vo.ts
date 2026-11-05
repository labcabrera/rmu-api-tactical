import type { CriticalRerollKind } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { CriticalResult } from './critical-result.vo.js';

export class Critical {
  constructor(
    public key: string,
    public status: string,
    public criticalType: string,
    public criticalSeverity: string,
    public adjustedRoll: number | undefined,
    public result: CriticalResult | undefined,
    /** Fighting style ability that changed the critical before the roll (workspace spec 032). */
    public styleOption?: CriticalStyleOption,
    /** Workspace spec 076, decision B8: the first roll of a critical rolled again; the second one counts. */
    public originalRoll?: number | null,
    /** Who rolled it again: the attacker (Sense Weakness) or the defender (Study Offense). */
    public rerolledBy?: CriticalRerollKind,
  ) {}
}

export type CriticalStyleOption = { abilityId: string; originalType: string; originalSeverity: string };
