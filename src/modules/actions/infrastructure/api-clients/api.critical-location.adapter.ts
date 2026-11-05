import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import type { CriticalLocationPort } from '../../application/ports/critical-location.port.js';
import { type CriticalLocationRange, toCriticalLocationRanges } from '../../domain/services/critical-location.js';

interface CriticalLocationResponse {
  from: number;
  to: number;
  location: string | null;
}

/**
 * `GET /critical-tables/locations` of rmu-api-attack-tables (workspace spec 077, decision B2.2). The tables do not change
 * while the API runs, so the map is read once and kept in memory; a failed read is not kept, and the next call asks again.
 */
@Injectable()
export class ApiCriticalLocationAdapter implements CriticalLocationPort {
  private readonly apiAttackTablesUri: string;
  private cached?: Promise<CriticalLocationRange[]>;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  findLocations(): Promise<CriticalLocationRange[]> {
    this.cached ??= this.read().catch((err: unknown) => {
      this.cached = undefined;
      throw err;
    });
    return this.cached;
  }

  private async read(): Promise<CriticalLocationRange[]> {
    const token = await this.tokenService.getToken();
    const data = await this.httpClient.get<CriticalLocationResponse[]>(`${this.apiAttackTablesUri}/critical-tables/locations`, { token });
    return toCriticalLocationRanges(data || []);
  }
}
