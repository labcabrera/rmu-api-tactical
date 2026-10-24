import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityError } from '../../../shared/domain/errors/errors.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { PsychologyTablesPort } from '../../application/ports/psychology-tables.port.js';
import type { PsychologyTables } from '../../domain/value-objects/psychology-tables.vo.js';

/** The tables change only when core imports them again: they are read at most once in this time. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** `GET /v1/psychology-tables` of core. */
@Injectable()
export class ApiPsychologyTablesAdapter implements PsychologyTablesPort {
  private readonly apiCoreUri: string;
  private cache: { at: number; tables: PsychologyTables } | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async find(): Promise<PsychologyTables> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.tables;
    }
    try {
      const tables = await this.httpClient.get<PsychologyTables>(`${this.apiCoreUri}/psychology-tables`, {
        token: await this.tokenService.getToken(),
      });
      this.cache = { at: Date.now(), tables };
      return tables;
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        throw new UnprocessableEntityError('Core has no psychology tables imported', 'err-psychology-tables-missing');
      }
      throw err;
    }
  }
}
