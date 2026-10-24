import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../shared/infrastructure/security/auth.module';
import { SharedModule } from '../shared/shared.module';
import { CharacterApiClient } from './infrastructure/api-clients/api.character.adapter';
import { StrategicGameApiClient } from './infrastructure/api-clients/api.strategic-game.adapter';
import { TacticalOutcomeApiClient } from './infrastructure/api-clients/api.tactical-outcome.adapter';
import { ItemApiClient } from './infrastructure/api-clients/api.item.adapter';

import { CHARACTER_PORT } from './application/ports/character.port';
import { ITEM_PORT } from './application/ports/item.port';
import { STRATEGIC_GAME_PORT } from './application/ports/strategic-game.port';
import { TACTICAL_OUTCOME_PORT } from './application/ports/tactical-outcome.port';
@Module({
  imports: [ConfigModule, AuthModule, SharedModule],
  controllers: [],
  providers: [
    {
      provide: CHARACTER_PORT,
      useClass: CharacterApiClient,
    },
    {
      provide: STRATEGIC_GAME_PORT,
      useClass: StrategicGameApiClient,
    },
    {
      provide: TACTICAL_OUTCOME_PORT,
      useClass: TacticalOutcomeApiClient,
    },
    {
      provide: ITEM_PORT,
      useClass: ItemApiClient,
    },
  ],
  exports: [CHARACTER_PORT, STRATEGIC_GAME_PORT, TACTICAL_OUTCOME_PORT, ITEM_PORT],
})
export class StrategicModule {}
