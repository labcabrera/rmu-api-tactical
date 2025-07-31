import { Logger } from '@domain/ports/logger';
import { SkillClient } from '@domain/ports/skill-client';

//TODO move to settings
const API_CORE_URL = 'http://localhost:3001/v1';

export class SkillAPICoreClient implements SkillClient {

    constructor(private readonly logger: Logger) {}
    
    async getAll(): Promise<any> {
        const url = `${API_CORE_URL}/skills`;
        this.logger.info(`Fetching all skills from ${url}`);
        try {
            const response = await fetch(url);
            if (response.status != 200) {
                throw { status: 500, message: 'Error reading skills' };
            }
            const responseBody = await response.json() as { content: any[] };
            return responseBody.content;
        } catch (error) {
            throw new Error(`Error reading skill info from ${url}: ${error}`);
        }
    }
}