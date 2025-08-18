/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

import { CoreModule } from './modules/core/core.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        PORT: Joi.number().positive().default(3001),
        RMU_MONGO_CORE_URI: Joi.string().required(),
        RMU_IAM_JWK_URI: Joi.string().uri().required(),
        RMU_IAM_TOKEN_URI: Joi.string().uri().required(),
        RMU_IAM_CLIENT_ID: Joi.string().required(),
        RMU_IAM_CLIENT_SECRET: Joi.string().required(),
        RMU_KAFKA_BROKERS: Joi.string().required(),
        RMU_KAFKA_CLIENT_ID: Joi.string().required(),
        RMU_KAFKA_DEFAULT_PARTITIONS: Joi.number().integer().min(1).default(1),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('RMU_MONGO_CORE_URI'),
      }),
      inject: [ConfigService],
    }),
    CoreModule,
    AuthModule,
  ],
})
export class AppModule {}
