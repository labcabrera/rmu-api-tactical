import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { CharacterMagicPort, CharacterSpellcasting } from '../../application/ports/character-magic.port.js';

@Injectable()
export class CharacterMagicApiClient implements CharacterMagicPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findSpellcasting(characterId: string): Promise<CharacterSpellcasting | undefined> {
    const token = await this.tokenService.getToken();
    try {
      return await this.httpClient.get<CharacterSpellcasting>(`${this.baseUri}/characters/${characterId}/spellcasting`, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return undefined;
      }
      throw err;
    }
  }

  async spendPower(characterId: string, amount: number): Promise<void> {
    const token = await this.tokenService.getToken();
    await this.httpClient.post(`${this.baseUri}/characters/${characterId}/power/spend`, { amount }, { token });
  }
}
