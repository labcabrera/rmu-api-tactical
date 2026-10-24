import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module.js';
import { GamesModule } from '../games/games.module.js';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import { FearCheckHandler } from './application/cqrs/handlers/fear-check.handler.js';
import { MoraleCheckHandler, RallyCheckHandler } from './application/cqrs/handlers/leader-checks.handler.js';
import { ResistanceRollHandler } from './application/cqrs/handlers/resistance-roll.handler.js';
import { PSYCHOLOGY_TABLES_PORT } from './application/ports/psychology-tables.port.js';
import { GroupCheckService } from './application/services/group-check.service.js';
import { ApiPsychologyTablesAdapter } from './infrastructure/api-clients/api.psychology-tables.adapter.js';
import { GroupCheckController } from './interfaces/http/group-check.controller.js';
import { ResistanceRollController } from './interfaces/http/resistance-roll.controller.js';

/** Resistance rolls and fear, morale and rally checks (workspace spec 022, Core Law ch. 14). */
@Module({
  imports: [CqrsModule, ConfigModule, AuthModule, SharedModule, GamesModule, StrategicModule, ActorsRoundModule],
  controllers: [ResistanceRollController, GroupCheckController],
  providers: [
    ResistanceRollHandler,
    GroupCheckService,
    FearCheckHandler,
    MoraleCheckHandler,
    RallyCheckHandler,
    { provide: PSYCHOLOGY_TABLES_PORT, useClass: ApiPsychologyTablesAdapter },
  ],
  exports: [PSYCHOLOGY_TABLES_PORT],
})
export class PsychologyModule {}
