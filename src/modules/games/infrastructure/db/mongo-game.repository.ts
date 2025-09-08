/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';

import { Page } from '../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../shared/domain/errors';
import { RsqlParser } from '../../../shared/infrastructure/messaging/rsql-parser';
import { GameRepository } from '../../application/ports/game.repository';
import { Actor } from '../../domain/entities/actor.vo';
import { Game } from '../../domain/entities/game.aggregate';
import { GameDocument, GameModel } from '../persistence/models/game.model';

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

  async findByStrategicId(strategicGameId: string): Promise<Game[]> {
    const games = await this.gameModel.find({ strategicGameId });
    return games.map((doc) => this.mapToEntity(doc));
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

  async save(game: Game): Promise<Game> {
    const persistable = game.toPersistence();
    const { id, ...rest } = persistable;
    const model = new this.gameModel({ ...rest, _id: id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, update: Partial<Game>): Promise<Game> {
    const persistable = update instanceof Game ? update.toPersistence() : update;
    const updatedGame = await this.gameModel.findByIdAndUpdate(id, { $set: persistable }, { new: true });
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
    return new Game(
      doc.id as string,
      doc.strategicGameId,
      doc.name,
      doc.status,
      doc.round,
      doc.phase,
      doc.factions,
      doc.actors ? doc.actors.map((a) => new Actor(a.id, a.name, a.factionId, a.type, a.owner)) : [],
      doc.description,
      doc.owner,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
