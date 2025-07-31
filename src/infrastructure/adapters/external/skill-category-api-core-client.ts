import { Logger } from '@domain/ports/logger';
import { SkillCategoryClient } from '@domain/ports/skill-category-client';

//TODO move to settings
const API_CORE_URL = 'http://localhost:3001/v1';

export class SkillCategoryAPICoreClient implements SkillCategoryClient {

    constructor(private readonly logger: Logger) {}

    async getSkillCategoryById(categoryId: string): Promise<any> {
        const url = `${API_CORE_URL}/skill-categories/${categoryId}`;
        this.logger.info(`Fetching skill category from ${url}`);
        try {
            const response = await fetch(url);
            if (response.status != 200) {
                throw { status: 500, message: 'Error reading skill category' };
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Error reading skill category info from ${url}: ${error}`);
        }
    }

}
