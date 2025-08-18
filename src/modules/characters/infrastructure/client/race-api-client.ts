/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { TokenService } from 'src/modules/auth/token.service';
import { RaceClient } from '../../application/ports/out/race-client';

@Injectable()
export class RaceApiClient implements RaceClient {
  constructor(private readonly tokenService: TokenService) {}

  async getRaceById(raceId: string): Promise<any> {
    const token = await this.tokenService.getToken();
    console.log('Token:', token);
    //TODO READ FROM CONFIG
    const uri = `http://localhost:3001/v1/races/${raceId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}
