import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { EnduranceManeuverResult, ManeuverPort } from '../../application/ports/maneuver-port';

@Injectable()
export class ApiManeuverAdapter implements ManeuverPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async enduranceManeuver(roll: number): Promise<EnduranceManeuverResult> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/maneuvers/endurance?roll=${roll}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as EnduranceManeuverResult;
  }
}
