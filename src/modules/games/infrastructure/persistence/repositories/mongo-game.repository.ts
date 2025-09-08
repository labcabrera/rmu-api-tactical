/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../../shared/domain/errors';
import { RsqlParser } from '../../../../shared/infrastructure/messaging/rsql-parser';
import { GameRepository } from '../../../application/ports/game.repository';
import { Game } from '../../../domain/entities/game.entity';
import { GameDocument, GameModel } from '../models/game.model';

@Injectable()
export class MongoGameRepository implements GameRepository {
  constructor(
    @InjectModel(GameModel.name) private gameModel: Model<GameDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Game | null> {
    const readed = await this.gameModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Game>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [gamesDocs, totalElements] = await Promise.all([
      this.gameModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.gameModel.countDocuments(mongoQuery),
    ]);
    const content = gamesDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Game>(content, page, size, totalElements);
  }

  async save(request: Partial<Game>): Promise<Game> {
    const model = new this.gameModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, update: Partial<Game>): Promise<Game> {
    const current = await this.gameModel.findById(id);
    if (!current) {
      throw new NotFoundError('Game', id);
    }
    const updatedGame = await this.gameModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedGame) {
      throw new NotFoundError('Game', id);
    }
    return this.mapToEntity(updatedGame);
  }

  async deleteById(id: string): Promise<Game | null> {
    const result = await this.gameModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.gameModel.exists({ _id: id });
    return exists !== null;
  }

  private mapToEntity(doc: GameDocument): Game {
    return {
      id: doc.id as string,
      strategicGameId: doc.strategicGameId,
      name: doc.name,
      round: doc.round,
      status: doc.status,
      phase: doc.phase,
      factions: doc.factions,
      actors: doc.actors,
      description: doc.description,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
