import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { ItemPort, StrategicItem } from '../../application/ports/item.port';

/** Reads the strategic items of a character with the service token (spec 019). */
@Injectable()
export class ItemApiClient implements ItemPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findByCharacterId(characterId: string): Promise<StrategicItem[]> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/items?q=characterId==${characterId}&page=0&size=1000`;
    try {
      const response = await axios.get<{ content?: StrategicItem[] }>(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data?.content || [];
    } catch (err) {
      throw handleAxiosError(err, uri);
    }
  }
}
