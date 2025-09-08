import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { StrategicGame, StrategicGamePort } from '../../application/ports/strategic-game.port';

@Injectable()
export class StrategicGameApiClient implements StrategicGamePort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findById(id: string): Promise<StrategicGame | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/strategic-games/${id}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as StrategicGame;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
}
