import { Logger } from "@domain/ports/logger";
import { SkillCategoryClient } from "@domain/ports/skill-category-client";
import { Configuration } from "../../../domain/ports/configuration";

export class SkillCategoryAPICoreClient implements SkillCategoryClient {
  constructor(
    private readonly logger: Logger,
    private readonly configuration: Configuration,
  ) {}

  async getSkillCategoryById(categoryId: string): Promise<any> {
    const url = `${this.configuration.getApiCoreUrl()}/skill-categories/${categoryId}`;
    this.logger.info(`Fetching skill category from ${url}`);
    try {
      const response = await fetch(url);
      if (response.status != 200) {
        throw { status: 500, message: "Error reading skill category" };
      }
      return await response.json();
    } catch (error) {
      throw new Error(
        `Error reading skill category info from ${url}: ${error}`,
      );
    }
  }
}
