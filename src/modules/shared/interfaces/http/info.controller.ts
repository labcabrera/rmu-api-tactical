import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../infrastructure/security/jwt-auth.guard.js';

export interface ApiInfo {
  name: string;
  version: string;
  uptimeSeconds: number;
}

/** Name and version from the package.json the image ships next to dist/ (spec 053); unknown when it is missing. */
const PACKAGE = ((): Pick<ApiInfo, 'name' | 'version'> => {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { name?: string; version?: string };
    return { name: pkg.name ?? 'unknown', version: pkg.version ?? 'unknown' };
  } catch {
    return { name: 'unknown', version: 'unknown' };
  }
})();

@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('v1/info')
@ApiTags('Health')
export class InfoController {
  @Get()
  @ApiOperation({ operationId: 'getInfo', summary: 'Name, version and uptime of the API' })
  info(): ApiInfo {
    return { ...PACKAGE, uptimeSeconds: Math.round(process.uptime()) };
  }
}
