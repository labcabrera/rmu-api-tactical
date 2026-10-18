import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { FumbleTableLookupRequest, FumbleTablePort } from '../../application/ports/fumble-table.port';
import { Fumble } from '../../domain/value-objects/action-attack.vo';
import { CriticalEffect } from '../../domain/value-objects/critical-result.vo';

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
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async lookup(request: FumbleTableLookupRequest): Promise<Fumble> {
    const token = await this.tokenService.getToken();
    const roll = Math.min(Math.max(Math.trunc(request.roll), MIN_ROLL), MAX_ROLL);
    const uri = `${this.apiAttackTablesUri}/fumble-tables/${request.fumbleTable}/${roll}`;
    try {
      const response = await axios.get<FumbleTableResponse>(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return this.mapResult(response.data);
    } catch (err: unknown) {
      throw handleAxiosError(err, uri);
    }
  }

  /** The fumble tables have no damage yet: 0 unless the entry gives it, as the Python service did. */
  private mapResult(data: FumbleTableResponse): Fumble {
    const effects = (data.effects || []).map(e => new CriticalEffect(e.status, e.rounds, e.value, e.delay, e.condition));
    return new Fumble('completed', data.text, data.additionalDamageText, data.damage || 0, effects);
  }
}
