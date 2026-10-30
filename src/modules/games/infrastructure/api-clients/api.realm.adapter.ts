import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { Realm, RealmPort } from '../../application/ports/realm.port.js';

@Injectable()
export class ApiRealmAdapter implements RealmPort {
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async findById(id: string): Promise<Realm | null> {
    const uri = `${this.apiCoreUri}/realms/${encodeURIComponent(id)}`;
    try {
      return await this.httpClient.get<Realm>(uri, { token: await this.tokenService.getToken() });
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
