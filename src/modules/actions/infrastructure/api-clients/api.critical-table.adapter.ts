import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { CriticalTableLookupRequest, CriticalTablePort } from '../../application/ports/critical-table.port';
import { CriticalResult } from '../../domain/value-objects/action-attack.vo';

@Injectable()
export class ApiCriticalTableAdapter implements CriticalTablePort {
  private readonly apiAttackTablesUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async lookup(request: CriticalTableLookupRequest): Promise<CriticalResult> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiAttackTablesUri}/critical-tables/${request.criticalType}/${request.criticalSeverity}/${request.roll}`;
    try {
      const response = await axios.get<CriticalResult>(uri, {
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
