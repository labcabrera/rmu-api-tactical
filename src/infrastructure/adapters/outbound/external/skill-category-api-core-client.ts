import { inject, injectable } from 'inversify';

import { Logger } from '@domain/ports/logger';
import { AuthTokenService } from '@domain/ports/outbound/auth-token-service';
import { SkillCategoryClient } from '@domain/ports/outbound/skill-category-client';

import { config } from '@infrastructure/config/config';
import { TYPES } from '@shared/types';
import { AuthenticatedApiClient } from './authenticated-api-client';

@injectable()
export class SkillCategoryAPICoreClient extends AuthenticatedApiClient implements SkillCategoryClient {
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.AuthTokenService) authTokenService: AuthTokenService
  ) {
    super(logger, authTokenService);
  }

  async getSkillCategoryById(categoryId: string): Promise<any> {
    const url = `${config.apiCoreUrl}/skill-categories/${categoryId}`;
    this.logger.info(`Fetching skill category from ${url}`);

    try {
      const response = await this.makeAuthenticatedRequest(url);
      return await this.handleApiResponse(response, url);
    } catch (error) {
      throw new Error(`Error reading skill category info from ${url}: ${error}`);
    }
  }
}
