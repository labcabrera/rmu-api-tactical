import { inject, injectable } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { AuthTokenService } from "@domain/ports/outbound/auth-token-service";
import { SkillClient } from "@domain/ports/outbound/skill-client";

import { config } from '@infrastructure/config/config';
import { TYPES } from '@shared/types';
import { AuthenticatedApiClient } from "./authenticated-api-client";

@injectable()
export class SkillAPICoreClient extends AuthenticatedApiClient implements SkillClient
{
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.AuthTokenService) authTokenService: AuthTokenService,
  ) {
    super(logger, authTokenService);
  }

  async getAllSkills(): Promise<any> {
    const url = `${config.apiCoreUrl}/skills`;
    this.logger.info(`Fetching all skills from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      const responseBody = await this.handleApiResponse<{ content: any[] }>(
        response,
        url,
      );
      return responseBody.content;
    } catch (error) {
      throw new Error(`Error reading skill info from ${url}: ${error}`);
    }
  }

  async getSkillById(skillId: string): Promise<any> {
    const url = `${config.apiCoreUrl}/skills/${skillId}`;
    this.logger.info(`Fetching skill from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(`Error reading skill info from ${url}: ${error}`);
    }
  }
}
