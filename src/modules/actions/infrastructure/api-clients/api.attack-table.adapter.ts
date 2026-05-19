import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { AttackTableLookupRequest, AttackTablePort } from '../../application/ports/attack-table.port';
import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo';

@Injectable()
export class ApiAttackTableAdapter implements AttackTablePort {
  private readonly apiAttackTablesUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiAttackTablesUri}/attack-tables/lookup`;
    try {
      const response = await axios.post<AttackTableEntry>(uri, request, {
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
