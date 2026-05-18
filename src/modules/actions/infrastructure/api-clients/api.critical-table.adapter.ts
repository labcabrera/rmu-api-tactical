import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { CriticalTableLookupRequest, CriticalTablePort } from '../../application/ports/critical-table.port';
import { CriticalResult } from '../../domain/value-objects/action-attack.vo';

@Injectable()
export class ApiCriticalTableAdapter implements CriticalTablePort {
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async lookup(request: CriticalTableLookupRequest): Promise<CriticalResult> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/critical-tables/lookup`;
    try {
      const response = await axios.post<CriticalResult>(uri, request, {
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
