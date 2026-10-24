import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { envSchema } from './config/env.schema';
import { ActionsModule } from './modules/actions/actions.module';
import { ActorsRoundModule } from './modules/actor-rounds/actor-rounds.module';
import { AuthModule } from './modules/shared/infrastructure/security/auth.module';
import { GamesModule } from './modules/games/games.module';
import { SharedModule } from './modules/shared/shared.module';
import { StrategicModule } from './modules/strategic/strategic.module';

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
  ],
})
export class AppModule {}
