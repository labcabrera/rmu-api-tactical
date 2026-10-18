/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

import { handleAxiosError } from '../shared/infrastructure/api-rest/axios.error.adapter';
import { currentRequestToken } from './request-token.context';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private readonly configService: ConfigService) {}

  private token: string | null = null;
  private expiresAt = 0;

  // Token for calls to the other RMU APIs: the caller's own token while handling an HTTP request (see
  // RequestTokenInterceptor), so permissions are checked for that user; the service account's token
  // (client credentials) otherwise, for example in Kafka consumers.
  async getToken(): Promise<string> {
    const userToken = currentRequestToken();
    if (userToken) return userToken;
    const now = Date.now();
    if (this.token && now < this.expiresAt) return this.token;

    const uri = this.configService.get<string>('RMU_IAM_TOKEN_URI')!;
    const clientId = this.configService.get<string>('RMU_IAM_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('RMU_IAM_CLIENT_SECRET')!;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    let data: any;
    try {
      ({ data } = await axios.post(uri, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }));
    } catch (err) {
      // Without a service token no call to the other APIs can work: report Keycloak's answer.
      throw handleAxiosError(err, uri);
    }

    this.token = data.access_token;
    this.expiresAt = now + data.expires_in * 1000 - 10_000; // 10s offset

    return this.token!;
  }
}
