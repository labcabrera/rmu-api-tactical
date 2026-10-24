import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { CharacterApiClient } from './infrastructure/api-clients/api.character.adapter';
import { StrategicGameApiClient } from './infrastructure/api-clients/api.strategic-game.adapter';
import { TacticalOutcomeApiClient } from './infrastructure/api-clients/api.tactical-outcome.adapter';
import { ItemApiClient } from './infrastructure/api-clients/api.item.adapter';

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
    {
      provide: 'TacticalOutcomeClient',
      useClass: TacticalOutcomeApiClient,
    },
    {
      provide: 'ItemClient',
      useClass: ItemApiClient,
    },
  ],
  exports: ['CharacterClient', 'StrategicGameClient', 'TacticalOutcomeClient', 'ItemClient'],
})
export class StrategicModule {}
