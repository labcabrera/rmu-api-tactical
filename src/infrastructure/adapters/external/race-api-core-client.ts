import { RaceClient } from "@domain/ports/race-client";
import { Configuration } from "../../../domain/ports/configuration";
import { Logger } from "../../../domain/ports/logger";

export class RaceAPICoreClient implements RaceClient {
  constructor(
    private readonly logger: Logger,
    private readonly configuration: Configuration,
  ) {}

  async getRaceById(raceId: string): Promise<any> {
    const url = `${this.configuration.getApiCoreUrl()}/races/${raceId}`;
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
