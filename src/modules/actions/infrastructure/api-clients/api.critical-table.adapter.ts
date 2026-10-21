import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { CriticalTableLookupRequest, CriticalTablePort } from '../../application/ports/critical-table.port';
import { AttackLocation } from '../../domain/value-objects/attack-location.vo';
import { CriticalEffect, CriticalInjury, CriticalResult } from '../../domain/value-objects/critical-result.vo';

interface CriticalTableEffect {
  status: string;
  rounds?: number;
  value?: number;
  delay?: number;
  condition?: string;
  applyTo?: 'source' | 'target';
}

interface CriticalTableResponse {
  message: string;
  dmg: number;
  location: string | null;
  effects?: CriticalTableEffect[];
  /** Spec 013, §2: present in the enriched tables. */
  injury?: CriticalInjury | null;
}

/** The critical tables name the limbs in singular. */
const TABLE_LOCATIONS: Record<AttackLocation, string> = {
  head: 'head',
  chest: 'chest',
  abdomen: 'abdomen',
  arms: 'arm',
  legs: 'leg',
};

const MIN_ROLL = 1;
const MAX_ROLL = 100;

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
    const roll = Math.min(Math.max(Math.trunc(request.roll), MIN_ROLL), MAX_ROLL);
    const location = request.location ? TABLE_LOCATIONS[request.location] : undefined;
    const query = location ? `?location=${location}` : '';
    const uri = `${this.apiAttackTablesUri}/critical-tables/${request.criticalType}/${request.criticalSeverity}/${roll}${query}`;
    try {
      const response = await axios.get<CriticalTableResponse>(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return this.mapResult(response.data);
    } catch (err: unknown) {
      throw handleAxiosError(err, uri);
    }
  }

  private mapResult(data: CriticalTableResponse): CriticalResult {
    const effects = (data.effects || []).map(e => new CriticalEffect(e.status, e.rounds, e.value, e.delay, e.condition, e.applyTo));
    const injury = data.injury?.type ? { type: data.injury.type, secondary: data.injury.secondary, flags: data.injury.flags } : undefined;
    return new CriticalResult(data.message || '', data.dmg || 0, data.location || '', effects, injury);
  }
}
