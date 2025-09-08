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
    return this.gameModel.findById(id).then((readed) => (readed ? this.mapToEntity(readed) : null));
  }

  async findByStrategicId(strategicGameId: string): Promise<Game[]> {
    return this.gameModel.find({ strategicGameId }).then((games) => games.map((doc) => this.mapToEntity(doc)));
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
    return model.save().then((saved) => this.mapToEntity(saved));
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
    return this.gameModel.findByIdAndDelete(id).then((result) => (result ? this.mapToEntity(result) : null));
  }

  private mapToEntity(doc: GameDocument): Game {
    if (!doc) {
      throw new NotFoundError('Game', 'unknown');
    }
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
