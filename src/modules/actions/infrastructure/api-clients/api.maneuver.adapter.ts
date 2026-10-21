import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import {
  AbsoluteManeuverResponse,
  EnduranceManeuverResult,
  ManeuverPort,
  PercentManeuverResponse,
} from '../../application/ports/maneuver.port';

@Injectable()
export class ApiManeuverAdapter implements ManeuverPort {
  private readonly logger = new Logger(ApiManeuverAdapter.name);
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async percent(roll: number): Promise<PercentManeuverResponse> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/maneuvers/percent?roll=${roll}`;
    try {
      const response = await axios.get<PercentManeuverResponse>(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      throw handleAxiosError(err, uri);
    }
  }

  async absolute(roll: number, table?: string, unusualEvent?: boolean): Promise<AbsoluteManeuverResponse> {
    const token = await this.tokenService.getToken();
    const params = new URLSearchParams({ roll: String(roll) });
    if (table) params.set('table', table);
    if (unusualEvent) params.set('unusualEvent', 'true');
    const uri = `${this.apiCoreUri}/maneuvers/absolute?${params.toString()}`;
    try {
      const response = await axios.get<AbsoluteManeuverResponse>(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data;
      return { result: data.result, message: data.message, effects: data.effects ?? [] };
    } catch (err) {
      throw handleAxiosError(err, uri);
    }
  }

  async endurance(roll: number): Promise<EnduranceManeuverResult> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/maneuvers/endurance?roll=${roll}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as EnduranceManeuverResult;
    } catch (err) {
      throw handleAxiosError(err, uri);
    }
  }
}
