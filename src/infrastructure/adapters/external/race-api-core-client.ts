import { RaceClient } from '@domain/ports/race-client';
import { Logger } from '../../../domain/ports/logger';

//TODO move to settings
const API_CORE_URL = 'http://localhost:3001/v1';

export class RaceAPICoreClient implements RaceClient {

    constructor(private readonly logger: Logger) {}

    async getRaceById(raceId: string): Promise<any> {
        const url = `${API_CORE_URL}/races/${raceId}`;
        this.logger.info(`Fetching race info from ${url}`);
        try {
            const response = await fetch(url);
            if (response.status != 200) {
                throw { status: 500, message: `Invalid race identifier ${raceId}` };
            }
            const responseBody = await response.json();
            return responseBody;
        } catch (error) {
            throw new Error(`Error reading race info from ${url}: ${error}`);
        }
    }
}