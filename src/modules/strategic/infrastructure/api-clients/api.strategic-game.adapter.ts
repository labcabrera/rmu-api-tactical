import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { StrategicGame, StrategicGamePort } from '../../application/ports/strategic-game.port.js';

@Injectable()
export class StrategicGameApiClient implements StrategicGamePort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findById(id: string): Promise<StrategicGame | null> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/strategic-games/${id}`;
    try {
      const data = await this.httpClient.get<unknown>(uri, { token });
      return data as StrategicGame;
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
