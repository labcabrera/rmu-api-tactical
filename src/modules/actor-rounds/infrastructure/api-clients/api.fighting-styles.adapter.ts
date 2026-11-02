import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { BadGatewayError } from '../../../shared/domain/errors/errors.js';
import type { FightingStylesPort } from '../../application/ports/fighting-styles.port.js';
import type { FightingStyleCatalog } from '../../domain/value-objects/fighting-style-catalog.vo.js';

/** The catalog changes only when core imports it again: it is read at most once in this time. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** `GET /v1/fighting-styles` of core (workspace spec 032). A 404 (styles not imported) is an empty catalog. */
@Injectable()
export class ApiFightingStylesAdapter implements FightingStylesPort {
  private readonly apiCoreUri: string;
  private cache: { at: number; catalog: FightingStyleCatalog } | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async getFightingStyles(): Promise<FightingStyleCatalog> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.catalog;
    }
    let catalog: FightingStyleCatalog;
    try {
      const data = await this.httpClient.get<FightingStyleCatalog>(`${this.apiCoreUri}/fighting-styles`, {
        token: await this.tokenService.getToken(),
      });
      catalog = { styles: data?.styles ?? [], abilities: data?.abilities ?? [] };
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        catalog = { styles: [], abilities: [] };
      } else {
        throw new BadGatewayError('Fighting styles are not available');
      }
    }
    this.cache = { at: Date.now(), catalog };
    return catalog;
  }
}
