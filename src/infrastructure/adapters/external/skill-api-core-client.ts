import { Logger } from "@domain/ports/logger";
import { SkillClient } from "@domain/ports/outbound/skill-client";
import { Configuration } from "../../../domain/ports/configuration";
import { AuthTokenService } from "../../../domain/ports/outbound/auth-token-service";
import { AuthenticatedApiClient } from "./authenticated-api-client";

export class SkillAPICoreClient
  extends AuthenticatedApiClient
  implements SkillClient
{
  constructor(
    logger: Logger,
    configuration: Configuration,
    authTokenService: AuthTokenService,
  ) {
    super(logger, configuration, authTokenService);
  }

  async getAllSkills(): Promise<any> {
    const url = `${this.configuration.getApiCoreUrl()}/skills`;
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
    const url = `${this.configuration.getApiCoreUrl()}/skills/${skillId}`;
    this.logger.info(`Fetching skill from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(`Error reading skill info from ${url}: ${error}`);
    }
  }
}
