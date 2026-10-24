import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { RequestTokenInterceptor } from './modules/auth/request-token.context';
import { DomainExceptionFilter } from './modules/shared/interfaces/http/domain-exception.filter';

function configureOpenApi(app: INestApplication<any>) {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Tactical API')
    .setDescription('Rolemaster Unified Tactical API.')
    .setVersion('1.0')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'http://localhost/sso/realms/rmu/protocol/openid-connect/auth',
            tokenUrl: 'http://localhost/sso/realms/rmu/protocol/openid-connect/token',
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
    .addServer('http://localhost:3003', 'Local development server')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
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

  // Apply security schema to all paths except health endpoint
  for (const [path, methods] of Object.entries(document.paths) as [string, Record<string, object>][]) {
    for (const method of Object.keys(methods)) {
      if (path === '/health' && method === 'get') continue;
      methods[method] = { ...methods[method], security: [{ oauth2: [], 'access-token': [] }] };
    }
  }

  app.use('/api-spec', (_req: Request, res: Response) => {
    res.json(document);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  configureOpenApi(app);

  const clientId = app.get(ConfigService).get<string>('RMU_KAFKA_CLIENT_ID')!;
  const brokers = app.get(ConfigService).get<string>('RMU_KAFKA_BROKERS')!.split(',');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: clientId,
        brokers: brokers,
      },
      consumer: {
        groupId: app.get(ConfigService).get<string>('RMU_KAFKA_CONSUMER_GROUP_ID') || 'rmu-api-tactical-group',
      },
    },
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new RequestTokenInterceptor());
  await app.listen(app.get(ConfigService).get<string>('PORT') || 3003);
  await app.startAllMicroservices();
}

void bootstrap();
