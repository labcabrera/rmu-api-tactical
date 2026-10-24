import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RequestTokenInterceptor } from '../modules/shared/infrastructure/security/request-token.context.js';
import { DomainExceptionFilter } from '../modules/shared/interfaces/http/domain-exception.filter.js';

/**
 * The HTTP setup shared by main.ts and the e2e suite: CORS, validation, the error filter and the interceptor that keeps
 * the caller's token for the calls to the other APIs (TokenService).
 */
export function configureHttp(app: NestExpressApplication) {
  app.enableCors();
  app.enableShutdownHooks();
  // Unknown body fields are dropped, not rejected (whitelist without forbidNonWhitelisted).
  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true }, whitelist: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new RequestTokenInterceptor());
}
