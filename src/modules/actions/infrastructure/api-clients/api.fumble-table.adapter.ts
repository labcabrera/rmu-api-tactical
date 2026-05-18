import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { FumbleTableLookupRequest, FumbleTablePort } from '../../application/ports/fumble-table.port';
import { Fumble } from '../../domain/value-objects/action-attack.vo';

@Injectable()
export class ApiFumbleTableAdapter implements FumbleTablePort {
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async lookup(request: FumbleTableLookupRequest): Promise<Fumble> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/fumble-tables/lookup`;
    try {
      const response = await axios.post<Fumble>(uri, request, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err: unknown) {
      throw handleAxiosError(err, uri);
    }
  }
}
