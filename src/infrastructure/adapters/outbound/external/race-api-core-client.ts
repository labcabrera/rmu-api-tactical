import { RaceClient } from "@domain/ports/outbound/race-client";
import { Configuration } from "../../../../domain/ports/configuration";
import { Logger } from "../../../../domain/ports/logger";
import { AuthTokenService } from "../../../../domain/ports/outbound/auth-token-service";
import { AuthenticatedApiClient } from "./authenticated-api-client";

export class RaceAPICoreClient
  extends AuthenticatedApiClient
  implements RaceClient
{
  constructor(
    logger: Logger,
    configuration: Configuration,
    authTokenService: AuthTokenService,
  ) {
    super(logger, configuration, authTokenService);
  }

  async getRaceById(raceId: string): Promise<any> {
    const url = `${this.configuration.getApiCoreUrl()}/races/${raceId}`;
    this.logger.info(`Fetching race info from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(`Error reading race info from ${url}: ${error}`);
    }
  }
}
