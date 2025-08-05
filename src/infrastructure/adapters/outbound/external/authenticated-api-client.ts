import { Configuration } from "../../../../domain/ports/configuration";
import { Logger } from "../../../../domain/ports/logger";
import { AuthTokenService } from "../../../../domain/ports/outbound/auth-token-service";

export abstract class AuthenticatedApiClient {
  constructor(
    protected readonly logger: Logger,
    protected readonly configuration: Configuration,
    protected readonly authTokenService: AuthTokenService,
  ) {}

  protected async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const accessToken = await this.authTokenService.getAccessToken();
    const authenticatedOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    };

    this.logger.debug(`Making authenticated request to ${url}`);

    try {
      const response = await fetch(url, authenticatedOptions);

      // If we get a 401, the token might be expired, clear cache and retry once
      if (response.status === 401) {
        this.logger.info(
          `Received 401 from ${url}, clearing token cache and retrying`,
        );
        this.authTokenService.clearCache();

        const newAccessToken = await this.authTokenService.getAccessToken();
        authenticatedOptions.headers = {
          ...authenticatedOptions.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return await fetch(url, authenticatedOptions);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Error making authenticated request to ${url}: ${error}`,
      );
      throw error;
    }
  }

  protected async handleApiResponse<T>(
    response: Response,
    url: string,
  ): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
      this.logger.error(`API request to ${url} failed: ${error.message}`);
      throw error;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON response from ${url}: ${error}`);
      throw new Error(`Invalid JSON response from ${url}`);
    }
  }
}
