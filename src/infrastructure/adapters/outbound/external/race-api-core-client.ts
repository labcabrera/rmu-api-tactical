import { inject, injectable } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { AuthTokenService } from "@domain/ports/outbound/auth-token-service";
import { RaceClient } from "@domain/ports/outbound/race-client";

import { config } from '@infrastructure/config/config';
import { TYPES } from '@shared/types';
import { AuthenticatedApiClient } from "./authenticated-api-client";

@injectable()
export class RaceAPICoreClient extends AuthenticatedApiClient implements RaceClient
{
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.AuthTokenService) authTokenService: AuthTokenService,
  ) {
    super(logger, authTokenService);
  }

  async getRaceById(raceId: string): Promise<any> {
    const url = `${config.apiCoreUrl}/races/${raceId}`;
    this.logger.info(`Fetching race info from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(`Error reading race info from ${url}: ${error}`);
    }
  }
}
