import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { AttackClient, AttackCreationRequest, AttackCreationResponse } from '../../application/ports/out/attack-client';

@Injectable()
export class AttackApiClient implements AttackClient {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async prepareAttack(request: AttackCreationRequest): Promise<AttackCreationResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_ATTACK_URI') as string;
    const uri = `${apiCoreUri}/attacks`;
    const response = await axios.post(uri, request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as AttackCreationResponse;
  }
}
