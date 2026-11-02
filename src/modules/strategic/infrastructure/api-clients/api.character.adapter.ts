import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { Character, CharacterPort } from '../../application/ports/character.port.js';

@Injectable()
export class CharacterApiClient implements CharacterPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findById(id: string): Promise<Character | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/characters/${id}`;
    try {
      return await this.httpClient.get<Character>(uri, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return undefined;
      }
      throw err;
    }
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const token = await this.tokenService.getToken();
    // strategic answers a page, and takes up to 1000 per page for these catalogs (spec 020) [F-tactical-20].
    const uri = `${this.baseUri}/characters?q=gameId==${encodeURIComponent(gameId)}&page=0&size=1000`;
    const data = await this.httpClient.get<{ content?: Character[] }>(uri, { token });
    return data?.content || [];
  }
}
