import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { ItemPort, StrategicItem } from '../../application/ports/item.port.js';

/** Reads the strategic items of a character with the service token (spec 019). */
@Injectable()
export class ItemApiClient implements ItemPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findByCharacterId(characterId: string): Promise<StrategicItem[]> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/items?q=characterId==${encodeURIComponent(characterId)}&page=0&size=1000`;
    const data = await this.httpClient.get<{ content?: StrategicItem[] }>(uri, { token });
    return data?.content || [];
  }

  async findById(itemId: string): Promise<StrategicItem | undefined> {
    const token = await this.tokenService.getToken();
    try {
      return await this.httpClient.get<StrategicItem>(`${this.baseUri}/items/${encodeURIComponent(itemId)}`, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
