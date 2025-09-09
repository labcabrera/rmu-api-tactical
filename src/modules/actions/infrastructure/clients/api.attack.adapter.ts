import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { AttackCreationRequest, AttackCreationResponse, AttackPort } from '../../application/ports/attack.port';

@Injectable()
export class ApiAttackClientAdapter implements AttackPort {
  private readonly logger = new Logger(ApiAttackClientAdapter.name);
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
    try {
      const response = await axios.post(uri, request, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as AttackCreationResponse;
    } catch (err: unknown) {
      throw handleAxiosError(err, uri);
    }
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
