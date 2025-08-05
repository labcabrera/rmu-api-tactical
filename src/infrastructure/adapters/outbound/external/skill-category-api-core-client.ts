import { Logger } from "@domain/ports/logger";
import { SkillCategoryClient } from "@domain/ports/outbound/skill-category-client";
import { Configuration } from "../../../../domain/ports/configuration";
import { AuthTokenService } from "../../../../domain/ports/outbound/auth-token-service";
import { AuthenticatedApiClient } from "./authenticated-api-client";

export class SkillCategoryAPICoreClient
  extends AuthenticatedApiClient
  implements SkillCategoryClient
{
  constructor(
    logger: Logger,
    configuration: Configuration,
    authTokenService: AuthTokenService,
  ) {
    super(logger, configuration, authTokenService);
  }

  async getSkillCategoryById(categoryId: string): Promise<any> {
    const url = `${this.configuration.getApiCoreUrl()}/skill-categories/${categoryId}`;
    this.logger.info(`Fetching skill category from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(
        `Error reading skill category info from ${url}: ${error}`,
      );
    }
  }
}
