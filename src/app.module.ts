import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';

import { ActionsModule } from './modules/actions/actions.module';
import { ActorsRoundModule } from './modules/actor-rounds/actor-rounds.module';
import { AuthModule } from './modules/auth/auth.module';
import { GamesModule } from './modules/games/games.module';
import { SharedModule } from './modules/shared/shared.module';
import { StrategicModule } from './modules/strategic/strategic.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        PORT: Joi.number().positive().default(3001),
        RMU_MONGO_TACTICAL_URI: Joi.string().required(),
        RMU_IAM_JWK_URI: Joi.string().uri().required(),
        RMU_IAM_TOKEN_URI: Joi.string().uri().required(),
        RMU_IAM_CLIENT_ID: Joi.string().required(),
        RMU_IAM_CLIENT_SECRET: Joi.string().required(),
        RMU_KAFKA_BROKERS: Joi.string().required(),
        RMU_KAFKA_CLIENT_ID: Joi.string().required(),
        RMU_KAFKA_DEFAULT_PARTITIONS: Joi.number().integer().min(1).default(1),
        RMU_API_CORE_URI: Joi.string().uri().required(),
        RMU_API_ITEMS_URI: Joi.string().uri().required(),
        RMU_API_ATTACK_URI: Joi.string().uri().required(),
        RMU_API_STRATEGIC_URI: Joi.string().uri().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('RMU_MONGO_TACTICAL_URI'),
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    StrategicModule,
    AuthModule,
    GamesModule,
    ActorsRoundModule,
    ActionsModule,
  ],
})
export class AppModule {}
