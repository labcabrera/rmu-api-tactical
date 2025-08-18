/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from 'src/modules/core/infrastructure/controllers/domain-exception.filter';
import { AppModule } from './app.module';

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
            authorizationUrl: 'http://localhost:8090/realms/rmu-local/protocol/openid-connect/auth',
            tokenUrl: 'http://localhost:8090/realms/rmu-local/protocol/openid-connect/token',
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
  // Apply security schema to all paths
  document.paths = Object.entries(document.paths).reduce(
    (acc, [path, methods]) => {
      acc[path] = {};
      for (const method in methods) {
        acc[path][method] = {
          ...methods[method],
          security: [{ oauth2: [], 'access-token': [] }],
        };
      }
      return acc;
    },
    {} as typeof document.paths,
  );

  app.use('/api-spec', (req, res) => {
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
    },
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(app.get(ConfigService).get<string>('PORT') || 3003);
  await app.startAllMicroservices();
}

bootstrap();
