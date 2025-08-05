import {
  AuthToken,
  AuthTokenService,
  OAuth2ClientCredentials
} from "../../../domain/ports/auth-token-service";
import { Configuration } from "../../../domain/ports/configuration";
import { Logger } from "../../../domain/ports/logger";

export class OAuth2TokenService implements AuthTokenService {
  private cachedToken: AuthToken | null = null;
  private tokenRequestInProgress: Promise<AuthToken> | null = null;

  constructor(
    private readonly configuration: Configuration,
    private readonly logger: Logger,
  ) {}

  async getAccessToken(): Promise<string> {
    console.log("Getting access token");

    // Check if we have a valid cached token
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      this.logger.info("Using cached access token");
      return this.cachedToken.accessToken;
    }

    // If a token request is already in progress, wait for it
    if (this.tokenRequestInProgress) {
      this.logger.info("Token request already in progress, waiting...");
      const token = await this.tokenRequestInProgress;
      return token.accessToken;
    }

    // Start a new token request
    this.logger.info("Requesting new access token");
    this.tokenRequestInProgress = this.requestNewToken();

    try {
      const token = await this.tokenRequestInProgress;
      this.cachedToken = token;
      return token.accessToken;
    } finally {
      this.tokenRequestInProgress = null;
    }
  }

  clearCache(): void {
    this.logger.info("Clearing token cache");
    this.cachedToken = null;
    this.tokenRequestInProgress = null;
  }

  private async requestNewToken(): Promise<AuthToken> {
    const credentials = this.getOAuth2Credentials();
    
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    if (credentials.scope) {
      body.append("scope", credentials.scope);
    }

    this.logger.debug(`Requesting token from ${credentials.tokenUrl}`);

    try {
      const response = await fetch(credentials.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token request failed with status ${response.status}: ${errorText}`
        );
      }

      const tokenResponse: any = await response.json();

      const expiresIn = tokenResponse.expires_in || 3600;
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      const token: AuthToken = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || "Bearer",
        expiresIn,
        expiresAt,
      };

      this.logger.info(`Successfully obtained access token, expires at ${expiresAt.toISOString()}`);
      
      return token;
    } catch (error) {
      this.logger.error(`Failed to obtain access token: ${error}`);
      throw new Error(`Failed to obtain access token: ${error}`);
    }
  }

  private isTokenValid(token: AuthToken): boolean {
    // Add 5 minutes buffer to prevent using tokens that are about to expire
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    const expiresWithBuffer = new Date(token.expiresAt.getTime() - bufferMs);
    
    return now < expiresWithBuffer;
  }

  private getOAuth2Credentials(): OAuth2ClientCredentials {
    const clientId: string = this.configuration.getOAuth2ClientId();
    const clientSecret: string = this.configuration.getOAuth2ClientSecret();
    const tokenUrl: string = this.configuration.getOAuth2TokenUrl();
    const scope: string = this.configuration.getOAuth2Scope() || "";
    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error(
        "OAuth2 credentials not configured. Please set OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, and OAUTH2_TOKEN_URL environment variables."
      );
    }
    return {
      clientId,
      clientSecret,
      tokenUrl,
      scope
    };
  }
}

