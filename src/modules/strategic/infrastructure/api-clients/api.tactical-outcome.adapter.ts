import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TacticalOutcomePort, TacticalOutcomeRequest } from '../../application/ports/tactical-outcome.port';

/** Writes the outcome of a finished tactical game to the strategic character, with the service token (spec 013, §3). */
@Injectable()
export class TacticalOutcomeApiClient implements TacticalOutcomePort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async apply(characterId: string, request: TacticalOutcomeRequest): Promise<void> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/characters/${characterId}/tactical-outcomes`;
    await this.httpClient.post(uri, request, { token });
  }
}
