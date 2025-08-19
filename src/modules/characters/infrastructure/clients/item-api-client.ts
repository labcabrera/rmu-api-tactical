import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { ItemClient, ItemResponse } from '../../application/ports/out/item-client';

@Injectable()
export class ItemApiClient implements ItemClient {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getItemById(itemId: string): Promise<ItemResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_ITEMS_URI') as string;
    const uri = `${apiCoreUri}/items/${itemId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as ItemResponse;
  }
}
