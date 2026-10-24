import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@Controller('v1/health')
@ApiTags('Health')
export class HealthController {
  constructor(
    private config: ConfigService,
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private indicators: HealthIndicatorService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.memory.checkHeap('memory_heap', 350 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 350 * 1024 * 1024),
      async (): Promise<HealthIndicatorResult> => {
        const rmuApiCoreUri = this.config.get<string>('RMU_API_CORE_URI');
        const healthUri = `${rmuApiCoreUri}/health`;
        return await this.pingCheck('rmu-api-core', healthUri);
      },
      () => this.memory.checkRSS('memory_rss', 350 * 1024 * 1024),
      async (): Promise<HealthIndicatorResult> => {
        const rmuApiCoreUri = this.config.get<string>('RMU_API_STRATEGIC_URI');
        const healthUri = `${rmuApiCoreUri}/health`;
        return await this.pingCheck('rmu-api-strategic', healthUri);
      },
    ]);
  }

  /** GET of another API, up on a 2xx: what terminus' HttpHealthIndicator did over axios, here with fetch. */
  private async pingCheck(key: string, uri: string): Promise<HealthIndicatorResult> {
    const check = this.indicators.check(key);
    try {
      const response = await fetch(uri);
      return response.ok
        ? check.up()
        : check.down({ message: `Request failed with status code ${response.status}`, statusCode: response.status });
    } catch (error) {
      return check.down({ message: error instanceof Error ? error.message : String(error) });
    }
  }
}
