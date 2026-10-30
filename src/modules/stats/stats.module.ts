import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from '../shared/shared.module.js';
import { GameModel, GameSchema } from '../games/infrastructure/persistence/models/game.model.js';
import { STATS_READER } from './application/ports/stats-reader.port.js';
import { GetStatsHandler } from './application/cqrs/handlers/get-stats.handler.js';
import { MongoStatsReader } from './infrastructure/db/mongo.stats.reader.js';
import { StatsController } from './interfaces/http/stats.controller.js';

/** Counts for the administration dashboard (spec 053), read straight from the collections of the other modules. */
@Module({
  imports: [CqrsModule, MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]), SharedModule],
  controllers: [StatsController],
  providers: [GetStatsHandler, { provide: STATS_READER, useClass: MongoStatsReader }],
})
export class StatsModule {}
