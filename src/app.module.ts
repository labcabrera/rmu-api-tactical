import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { envSchema } from './config/env.schema.js';
import { ActionsModule } from './modules/actions/actions.module.js';
import { ActorsRoundModule } from './modules/actor-rounds/actor-rounds.module.js';
import { AuthModule } from './modules/shared/infrastructure/security/auth.module.js';
import { GamesModule } from './modules/games/games.module.js';
import { PoisonsModule } from './modules/poisons/poisons.module.js';
import { PsychologyModule } from './modules/psychology/psychology.module.js';
import { SharedModule } from './modules/shared/shared.module.js';
import { StrategicModule } from './modules/strategic/strategic.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
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
    PsychologyModule,
    PoisonsModule,
  ],
})
export class AppModule {}
