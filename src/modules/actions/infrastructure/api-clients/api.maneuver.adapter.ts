import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
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
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async percent(roll: number): Promise<PercentManeuverResponse> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/maneuvers/percent?roll=${roll}`;
    const data = await this.httpClient.get<PercentManeuverResponse>(uri, { token });
    return data;
  }

  async absolute(roll: number, table?: string, unusualEvent?: boolean): Promise<AbsoluteManeuverResponse> {
    const token = await this.tokenService.getToken();
    const params = new URLSearchParams({ roll: String(roll) });
    if (table) params.set('table', table);
    if (unusualEvent) params.set('unusualEvent', 'true');
    const uri = `${this.apiCoreUri}/maneuvers/absolute?${params.toString()}`;
    const data = await this.httpClient.get<AbsoluteManeuverResponse>(uri, { token });
    return { result: data.result, message: data.message, effects: data.effects ?? [] };
  }

  async endurance(roll: number): Promise<EnduranceManeuverResult> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/maneuvers/endurance?roll=${roll}`;
    const data = await this.httpClient.get<unknown>(uri, { token });
    return data as EnduranceManeuverResult;
  }
}
