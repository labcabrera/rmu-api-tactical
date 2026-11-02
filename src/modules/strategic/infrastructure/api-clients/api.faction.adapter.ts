import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { FactionPort, StrategicFaction } from '../../application/ports/faction.port.js';

@Injectable()
export class FactionApiClient implements FactionPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findById(id: string): Promise<StrategicFaction | null> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/factions/${encodeURIComponent(id)}`;
    try {
      return await this.httpClient.get<StrategicFaction>(uri, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
