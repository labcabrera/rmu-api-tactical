import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { RequestTokenInterceptor } from '../modules/shared/infrastructure/security/request-token.context.js';
import { HttpExceptionFilter } from '../modules/shared/interfaces/http/http-exception.filter.js';

/** Comma-separated list, without blanks. */
export const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);

/**
 * The HTTP setup shared by main.ts and the e2e suite (spec 020, as in rmu-api-core): client IPs from the proxy,
 * security headers, CORS only for the configured origins, validation, the error format and the interceptor that keeps
 * the caller's token for the calls to the other APIs (TokenService).
 */
export function configureHttp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  // Behind Caddy the client is the first untrusted address in X-Forwarded-For, which the throttler counts.
  app.set('trust proxy', config.get<string>('RMU_TRUST_PROXY'));
  // The Swagger UI pages run their own scripts, so only /api-docs goes without a Content-Security-Policy.
  const apiHeaders = helmet();
  const docsHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api-docs') ? docsHeaders : apiHeaders)(req, res, next),
  );
  // Browsers reach the API through the gateway on the same origin: without a list there is no CORS at all.
  const origins = splitList(config.get<string>('RMU_CORS_ORIGINS'));
  if (origins.length > 0) app.enableCors({ origin: origins });
  app.enableShutdownHooks();
  // Unknown body fields are dropped, not rejected (whitelist without forbidNonWhitelisted).
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestTokenInterceptor());
}
