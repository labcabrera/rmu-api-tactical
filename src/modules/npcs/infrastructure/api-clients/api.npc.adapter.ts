import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { Npc, NpcPort } from '../../application/ports/npc.port.js';

@Injectable()
export class ApiNpcAdapter implements NpcPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_NPCS_URI') as string;
  }

  async findById(id: string): Promise<Npc | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/npcs/${id}`;
    try {
      const data = await this.httpClient.get<unknown>(uri, { token });
      return data as Npc;
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return undefined;
      }
      throw err;
    }
  }
}
