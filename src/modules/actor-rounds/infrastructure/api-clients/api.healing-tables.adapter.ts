import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type {
  CauterizationRow,
  HealingCombatRules,
  HealingTablesPort,
  TreatmentDifficultyRow,
  TreatmentDuration,
  TreatmentRules,
  TreatmentTables,
} from '../../application/ports/healing-tables.port.js';
import { DEFAULT_HEALING_COMBAT_RULES, type TreatmentLimitsRules } from '../../domain/value-objects/treatment-difficulty.vo.js';

interface HealingTablesResponse {
  treatmentDifficulties?: TreatmentDifficultyRow[] | null;
  treatmentRules?: Partial<TreatmentRules> | null;
  treatmentDurations?: TreatmentDuration[] | null;
  cauterization?: CauterizationRow[] | null;
  cauterizationUnusualRoll?: number | null;
  surgeryRequired?: { injuryType: string; severity: string }[] | null;
  treatmentLimits?: TreatmentLimitsRules | null;
  tourniquet?: { loosenEveryRounds: number; graceRounds: number } | null;
  stabilize?: { difficulty: string; successRounds: number; absoluteRounds: number } | null;
  salveModifier?: { min: number; max: number } | null;
  combatItemAp?: number | null;
}

/** Rules when core sends rows without them. */
const DEFAULT_RULES: TreatmentRules = { headDifficultySteps: 1, cauterizePenaltyPerBleeding: -5 };

/** The tables change only when core imports them again: they are read at most once in this time. */
const CACHE_TTL_MS = 5 * 60 * 1000;

const arrayOf = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

/**
 * `GET /v1/healing-tables` of core. A 404 (tables not imported) or an empty list (imported before spec 022) is no
 * table; the fields of workspace spec 068 that an older document lacks (null) take neutral defaults.
 */
@Injectable()
export class ApiHealingTablesAdapter implements HealingTablesPort {
  private readonly apiCoreUri: string;
  private cache: { at: number; data: HealingTablesResponse | null } | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async treatmentTables(): Promise<TreatmentTables | null> {
    const data = await this.read();
    const rows = arrayOf(data?.treatmentDifficulties);
    return rows.length > 0 ? { difficulties: rows, rules: { ...DEFAULT_RULES, ...(data?.treatmentRules ?? {}) } } : null;
  }

  async combatRules(): Promise<HealingCombatRules> {
    return ApiHealingTablesAdapter.toCombatRules(await this.read());
  }

  static toCombatRules(data: HealingTablesResponse | null): HealingCombatRules {
    const defaults = DEFAULT_HEALING_COMBAT_RULES;
    return {
      treatmentDurations: arrayOf(data?.treatmentDurations),
      cauterization: arrayOf(data?.cauterization),
      cauterizationUnusualRoll: data?.cauterizationUnusualRoll ?? defaults.cauterizationUnusualRoll,
      surgeryRequired: arrayOf(data?.surgeryRequired),
      treatmentLimits: data?.treatmentLimits ?? defaults.treatmentLimits,
      tourniquet: data?.tourniquet ?? defaults.tourniquet,
      stabilize: data?.stabilize ?? defaults.stabilize,
      salveModifier: data?.salveModifier ?? defaults.salveModifier,
      combatItemAp: data?.combatItemAp ?? defaults.combatItemAp,
    };
  }

  private async read(): Promise<HealingTablesResponse | null> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.data;
    }
    let data: HealingTablesResponse | null;
    try {
      data = await this.httpClient.get<HealingTablesResponse>(`${this.apiCoreUri}/healing-tables`, {
        token: await this.tokenService.getToken(),
      });
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        data = null;
      } else {
        throw err;
      }
    }
    this.cache = { at: Date.now(), data };
    return data;
  }
}
