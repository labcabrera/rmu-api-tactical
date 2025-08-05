export interface AuthTokenService {
  getAccessToken(): Promise<string>;
  clearCache(): void;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface OAuth2ClientCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
}
