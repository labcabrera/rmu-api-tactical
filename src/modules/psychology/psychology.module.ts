import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module.js';
import { GamesModule } from '../games/games.module.js';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import { ResistanceRollHandler } from './application/cqrs/handlers/resistance-roll.handler.js';
import { PSYCHOLOGY_TABLES_PORT } from './application/ports/psychology-tables.port.js';
import { ApiPsychologyTablesAdapter } from './infrastructure/api-clients/api.psychology-tables.adapter.js';
import { ResistanceRollController } from './interfaces/http/resistance-roll.controller.js';

/** Resistance rolls and fear, morale and rally checks (workspace spec 022, Core Law ch. 14). */
@Module({
  imports: [CqrsModule, ConfigModule, AuthModule, SharedModule, GamesModule, StrategicModule, ActorsRoundModule],
  controllers: [ResistanceRollController],
  providers: [ResistanceRollHandler, { provide: PSYCHOLOGY_TABLES_PORT, useClass: ApiPsychologyTablesAdapter }],
  exports: [PSYCHOLOGY_TABLES_PORT],
})
export class PsychologyModule {}
