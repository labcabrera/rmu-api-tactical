import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { ManeuverPort, PercentManeuverResponse } from '../../application/ports/maneuver.port';

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
    const uri = `${this.apiCoreUri}/maneuvers/percent/${roll}`;
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
}
