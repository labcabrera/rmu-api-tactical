import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';

export function configureOpenApi(app: INestApplication) {
  const config = app.get(ConfigService);
  const oidcUri = `${config.get<string>('RMU_IAM_URI')}/realms/${config.get<string>('RMU_IAM_REALM')}/protocol/openid-connect`;
  const openApiConfig = new DocumentBuilder()
    .setTitle('Tactical API')
    .setDescription('Rolemaster Unified Tactical API.')
    .setVersion('1.0')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: `${oidcUri}/auth`,
            tokenUrl: `${oidcUri}/token`,
            scopes: {
              read: 'Read',
              write: 'Write',
            },
          },
        },
      },
      'oauth2',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  // Every path needs a token, except the health check (spec 021, F-items-02).
  for (const [path, methods] of Object.entries(document.paths)) {
    if (path === '/v1/health') continue;
    for (const operation of Object.values(methods as Record<string, unknown>)) {
      if (operation && typeof operation === 'object' && 'responses' in operation) {
        (operation as { security?: Record<string, string[]>[] }).security = [{ oauth2: [], 'access-token': [] }];
      }
    }
  }
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      urls: [
        {
          url: '/api-spec',
          name: 'OpenAPI Specification',
        },
      ],
    },
  });
  app.use('/api-spec', (_req: Request, res: Response) => {
    res.json(document);
  });
  return document;
}
