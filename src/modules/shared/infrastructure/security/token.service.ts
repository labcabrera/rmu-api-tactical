import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readBody, sendRequest, upstreamError } from '../http/http-client';
import { currentRequestToken } from './request-token.context';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class TokenService {
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

    // Without a service token no call to the other APIs can work: a failure reports Keycloak's answer.
    const response = await sendRequest(uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await readBody(response);
    if (!response.ok) throw upstreamError(uri, response.status, response.statusText, data);
    const { access_token, expires_in } = data as TokenResponse;

    this.token = access_token;
    this.expiresAt = now + expires_in * 1000 - 10_000; // 10s offset

    return this.token;
  }
}
