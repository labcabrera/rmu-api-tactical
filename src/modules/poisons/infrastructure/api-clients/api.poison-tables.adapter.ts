import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoisonTables } from '../../../actor-rounds/domain/value-objects/poison.vo.js';
import { UnprocessableEntityError } from '../../../shared/domain/errors/errors.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { PoisonTablesPort } from '../../application/ports/poison-tables.port.js';

/** The tables change only when core imports them again: they are read at most once in this time. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** `GET /v1/poison-tables` of core. A 404 or an empty table is no table. */
@Injectable()
export class ApiPoisonTablesAdapter implements PoisonTablesPort {
  private readonly apiCoreUri: string;
  private cache: { at: number; tables: PoisonTables } | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async find(): Promise<PoisonTables> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.tables;
    }
    let rows: PoisonTables['rows'] = [];
    try {
      const data = await this.httpClient.get<Partial<PoisonTables>>(`${this.apiCoreUri}/poison-tables`, {
        token: await this.tokenService.getToken(),
      });
      rows = Array.isArray(data?.rows) ? data.rows : [];
    } catch (err: unknown) {
      if (!isUpstreamHttpError(err) || err.status !== 404) {
        throw err;
      }
    }
    if (rows.length === 0) {
      throw new UnprocessableEntityError('Core has no poison tables imported', 'err-poison-tables-missing');
    }
    this.cache = { at: Date.now(), tables: { rows } };
    return this.cache.tables;
  }
}
