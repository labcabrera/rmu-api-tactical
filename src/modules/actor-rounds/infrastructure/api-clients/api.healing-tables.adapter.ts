import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type {
  HealingTablesPort,
  TreatmentDifficultyRow,
  TreatmentRules,
  TreatmentTables,
} from '../../application/ports/healing-tables.port.js';

interface HealingTablesResponse {
  treatmentDifficulties?: TreatmentDifficultyRow[] | null;
  treatmentRules?: Partial<TreatmentRules> | null;
}

/** Rules when core sends rows without them. */
const DEFAULT_RULES: TreatmentRules = { headDifficultySteps: 1, cauterizePenaltyPerBleeding: -5 };

/** The tables change only when core imports them again: they are read at most once in this time. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** `GET /v1/healing-tables` of core. A 404 (tables not imported) or an empty list (imported before spec 022) is no table. */
@Injectable()
export class ApiHealingTablesAdapter implements HealingTablesPort {
  private readonly apiCoreUri: string;
  private cache: { at: number; tables: TreatmentTables | null } | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async treatmentTables(): Promise<TreatmentTables | null> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.tables;
    }
    let tables: TreatmentTables | null;
    try {
      const data = await this.httpClient.get<HealingTablesResponse>(`${this.apiCoreUri}/healing-tables`, {
        token: await this.tokenService.getToken(),
      });
      const rows = Array.isArray(data?.treatmentDifficulties) ? data.treatmentDifficulties : [];
      tables = rows.length > 0 ? { difficulties: rows, rules: { ...DEFAULT_RULES, ...(data.treatmentRules ?? {}) } } : null;
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        tables = null;
      } else {
        throw err;
      }
    }
    this.cache = { at: Date.now(), tables };
    return tables;
  }
}
