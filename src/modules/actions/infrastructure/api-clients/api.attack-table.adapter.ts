import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import type { AttackTableLookupRequest, AttackTablePort } from '../../application/ports/attack-table.port.js';
import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo.js';

const MIN_ROLL = 1;
const MAX_ROLL = 175;
const MIN_ARMOR = 1;
const MAX_ARMOR = 10;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(Math.trunc(value), min), max);

interface AttackTableResponse {
  text: string;
  damage: number | null;
  criticalType: string | null;
  criticalSeverity: string | null;
}

@Injectable()
export class ApiAttackTableAdapter implements AttackTablePort {
  private readonly apiAttackTablesUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry> {
    const token = await this.tokenService.getToken();
    const armor = clamp(request.armor || MIN_ARMOR, MIN_ARMOR, MAX_ARMOR);
    const roll = clamp(request.roll, MIN_ROLL, MAX_ROLL);
    // Only Medium tables (spec 033): the size is applied by the attack-size combat plugin.
    const uri = `${this.apiAttackTablesUri}/attack-tables/${encodeURIComponent(request.attackTable)}/${armor}/${roll}`;
    const data = await this.httpClient.get<AttackTableResponse>(uri, { token });
    return new AttackTableEntry(data.text, data.damage || 0, data.criticalType || undefined, data.criticalSeverity || undefined);
  }
}
