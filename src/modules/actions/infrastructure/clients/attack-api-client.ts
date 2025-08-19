import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { AttackClient, AttackCreationRequest, AttackCreationResponse } from '../../application/ports/out/attack-client';

@Injectable()
export class AttackApiClient implements AttackClient {
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_ATTACK_URI') as string;
  }

  async prepareAttack(request: AttackCreationRequest): Promise<AttackCreationResponse> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/attacks`;
    const response = await axios.post(uri, request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as AttackCreationResponse;
  }

  async deleteAttack(actionId: string): Promise<void> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiCoreUri}/attacks/${actionId}`;
    await axios.delete(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
