import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { GameModel } from '../../../games/infrastructure/persistence/models/game.model.js';
import type { StatsReader } from '../../application/ports/stats-reader.port.js';
import type { TacticalStats } from '../../domain/tactical-stats.js';
import { readCollectionStats } from './collection-stats.reader.js';

@Injectable()
export class MongoStatsReader implements StatsReader {
  constructor(@InjectModel(GameModel.name) private readonly games: Model<GameModel>) {}

  async read(now: Date): Promise<TacticalStats> {
    return { games: await readCollectionStats(this.games, now, 'status') };
  }
}
