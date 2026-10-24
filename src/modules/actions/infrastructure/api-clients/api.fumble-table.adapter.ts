import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import type { FumbleTableLookupRequest, FumbleTablePort } from '../../application/ports/fumble-table.port.js';
import { Fumble } from '../../domain/value-objects/action-attack.vo.js';
import { CriticalEffect } from '../../domain/value-objects/critical-result.vo.js';

interface FumbleTableEffect {
  status: string;
  rounds?: number;
  value?: number;
  delay?: number;
  condition?: string;
}

interface FumbleTableResponse {
  text?: string;
  additionalDamageText?: string;
  damage?: number;
  effects?: FumbleTableEffect[];
}

const MIN_ROLL = 1;
const MAX_ROLL = 100;

@Injectable()
export class ApiFumbleTableAdapter implements FumbleTablePort {
  private readonly apiAttackTablesUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async lookup(request: FumbleTableLookupRequest): Promise<Fumble> {
    const token = await this.tokenService.getToken();
    const roll = Math.min(Math.max(Math.trunc(request.roll), MIN_ROLL), MAX_ROLL);
    const uri = `${this.apiAttackTablesUri}/fumble-tables/${request.fumbleTable}/${roll}`;
    const data = await this.httpClient.get<FumbleTableResponse>(uri, { token });
    return this.mapResult(data);
  }

  /** The fumble tables have no damage yet: 0 unless the entry gives it, as the Python service did. */
  private mapResult(data: FumbleTableResponse): Fumble {
    const effects = (data.effects || []).map(e => new CriticalEffect(e.status, e.rounds, e.value, e.delay, e.condition));
    return new Fumble('completed', data.text, data.additionalDamageText, data.damage || 0, effects);
  }
}
