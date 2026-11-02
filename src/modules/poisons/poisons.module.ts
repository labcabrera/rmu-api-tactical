import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module.js';
import { GamesModule } from '../games/games.module.js';
import { PsychologyModule } from '../psychology/psychology.module.js';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import {
  CreatePoisoningHandler,
  DismissPoisoningHandler,
  GiveAntidoteHandler,
  ResolvePoisoningHandler,
} from './application/cqrs/handlers/poisoning.handlers.js';
import { POISON_TABLES_PORT } from './application/ports/poison-tables.port.js';
import { ApiPoisonTablesAdapter } from './infrastructure/api-clients/api.poison-tables.adapter.js';
import { PoisoningController } from './interfaces/http/poisoning.controller.js';

/** Poisonings (workspace spec 042, Core Law §15.6). */
@Module({
  imports: [CqrsModule, ConfigModule, AuthModule, SharedModule, GamesModule, StrategicModule, ActorsRoundModule, PsychologyModule],
  controllers: [PoisoningController],
  providers: [
    CreatePoisoningHandler,
    ResolvePoisoningHandler,
    DismissPoisoningHandler,
    GiveAntidoteHandler,
    { provide: POISON_TABLES_PORT, useClass: ApiPoisonTablesAdapter },
  ],
  exports: [POISON_TABLES_PORT],
})
export class PoisonsModule {}
