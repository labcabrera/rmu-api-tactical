import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { BadGatewayError, ValidationError } from '../../../shared/domain/errors';
import { AttackClient, AttackCreationRequest, AttackCreationResponse } from '../../application/ports/attack-client';

@Injectable()
export class AttackApiClient implements AttackClient {
  private readonly logger = new Logger(AttackApiClient.name);
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          this.logger.error(`Attack API is not available at ${uri}. Error code: ${err.code}`);
          throw new BadGatewayError('Attack API is not available');
        } else if (err.response && err.response.status) {
          this.logger.error(`Attack API return status ${err.response.status} at ${uri}. Error code: ${err.code}`);
          switch (err.response.status) {
            case 400:
              throw new ValidationError('Invalid request');
            default:
              break;
          }
        }
      }
      throw err;
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
