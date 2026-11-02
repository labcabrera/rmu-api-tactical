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
  ) {}
}

export type CriticalStyleOption = { abilityId: string; originalType: string; originalSeverity: string };
