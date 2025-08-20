import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { CharacterApiClient } from './infrastructure/clients/character-api-client';
import { StrategicGameApiClient } from './infrastructure/clients/strategic-game-api-client';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [],
  providers: [
    {
      provide: 'CharacterClient',
      useClass: CharacterApiClient,
    },
    {
      provide: 'StrategicGameClient',
      useClass: StrategicGameApiClient,
    },
  ],
  exports: ['CharacterClient', 'StrategicGameClient'],
})
export class StrategicModule {}
